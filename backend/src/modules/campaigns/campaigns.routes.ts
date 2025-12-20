import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { processCampaignSending } from './worker';

const prisma = new PrismaClient();

export async function campaignsRoutes(app: FastifyInstance) {
    // Helper to get a default user (since we don't have full auth yet)
    const getDefaultUser = async () => {
        let user = await prisma.user.findFirst();
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: 'admin@suresend.com',
                    password: 'hashed_password_placeholder', // In real app, this would be hashed
                    name: 'Admin User'
                }
            });
        }
        return user;
    };

    // GET /campaigns - List all
    app.get('/', async (request, reply) => {
        try {
            const campaigns = await prisma.campaign.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { emailLogs: true }
                    }
                }
            });
            return campaigns;
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error fetching campaigns' });
        }
    });

    // POST /campaigns - Create Draft
    app.post('/', async (request, reply) => {
        const { name, subject, body } = request.body as { name: string; subject: string; body: string };

        if (!name || !subject) {
            return reply.status(400).send({ message: 'Name and Subject are required' });
        }

        try {
            const user = await getDefaultUser();

            const campaign = await prisma.campaign.create({
                data: {
                    subject,
                    body: body || '',
                    status: 'DRAFT',
                    userId: user.id
                    // Todo: add 'name' to schema to save internal name
                }
            });
            return campaign;
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error creating campaign' });
        }
    });

    // PUT /campaigns/:id - Update
    app.put('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { subject, body } = request.body as { subject?: string; body?: string };

        try {
            const campaign = await prisma.campaign.update({
                where: { id },
                data: {
                    subject,
                    body
                }
            });
            return campaign;
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error updating campaign' });
        }
    });

    // POST /campaigns/:id/send - Send (Trigger Worker)
    app.post('/:id/send', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            const campaign = await prisma.campaign.findUnique({ where: { id } });
            if (!campaign) return reply.status(404).send({ message: 'Campaign not found' });
            if (campaign.status === 'COMPLETED' || campaign.status === 'PROCESSING') {
                return reply.status(400).send({ message: 'Campaign already processing or completed' });
            }

            // Start Worker in background
            processCampaignSending(id).catch(err => {
                app.log.error(`Background worker failed for campaign ${id}: ${err}`);
            });

            return { message: 'Campaign sending started', campaignId: id };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error sending campaign' });
        }
    });

    // GET /campaigns/:id/stats - Progress
    app.get('/:id/stats', async (request, reply) => {
        const { id } = request.params as { id: string };
        try {
            const campaign = await prisma.campaign.findUnique({
                where: { id },
                include: {
                    emailLogs: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                        include: { contact: true }
                    }
                }
            });

            if (!campaign) return reply.status(404).send({ message: 'Campaign not found' });

            const totalContacts = await prisma.contact.count({ where: { status: 'SUBSCRIBED' } });
            const failedCount = await prisma.emailLog.count({ where: { campaignId: id, status: 'FAILED' } });

            return {
                status: campaign.status,
                total: totalContacts,
                sent: campaign.sentCount,
                failed: failedCount,
                recentLogs: campaign.emailLogs.map(log => ({
                    email: log.contact.email,
                    status: log.status,
                    time: log.createdAt
                }))
            };

        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error fetching stats' });
        }
    });

    // DELETE /campaigns/:id - Delete
    app.delete('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            // First delete related logs to avoid FK constraints
            await prisma.emailLog.deleteMany({ where: { campaignId: id } });

            await prisma.campaign.delete({ where: { id } });
            return { message: 'Campaign deleted successfully' };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error deleting campaign' });
        }
    });
}
