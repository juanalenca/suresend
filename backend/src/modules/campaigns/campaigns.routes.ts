import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { processCampaignSending } from './worker';
import { campaignQueue } from '../../lib/queue';

const prisma = new PrismaClient();

export async function campaignsRoutes(app: FastifyInstance) {

    // GET /campaigns - List with pagination (filtered by brandId)
    app.get('/', async (request, reply) => {
        try {
            const { page, limit } = request.query as { page?: string; limit?: string };
            const brandId = request.brandId;

            const pageNum = parseInt(page || '1', 10);
            const limitNum = parseInt(limit || '10', 10);
            const skip = (pageNum - 1) * limitNum;

            // Filter by brandId if available
            const where = brandId ? { brandId } : {};

            const total = await prisma.campaign.count({ where });

            const campaigns = await prisma.campaign.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                include: {
                    _count: {
                        select: { emailLogs: true }
                    }
                }
            });

            return {
                data: campaigns,
                meta: {
                    total,
                    totalPages: Math.ceil(total / limitNum),
                    page: pageNum,
                    limit: limitNum
                }
            };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error fetching campaigns' });
        }
    });

    // POST /campaigns - Create Draft or Scheduled (with brandId)
    app.post('/', async (request, reply) => {
        const { name, subject, body, scheduledAt } = request.body as {
            name: string;
            subject: string;
            body: string;
            scheduledAt?: string;
        };

        if (!name || !subject) {
            return reply.status(400).send({ message: 'Name and Subject are required' });
        }

        try {
            const brandId = request.brandId;

            if (!brandId) {
                return reply.status(400).send({ message: 'Brand not selected' });
            }

            // Get user from brand
            const brand = await prisma.brand.findUnique({
                where: { id: brandId },
                select: { userId: true }
            });

            if (!brand) {
                return reply.status(400).send({ message: 'Invalid brand' });
            }

            const isScheduled = !!scheduledAt;
            const scheduledDate = isScheduled ? new Date(scheduledAt) : null;

            const campaign = await prisma.campaign.create({
                data: {
                    name: name || null,
                    subject,
                    body: body || '',
                    status: isScheduled ? 'SCHEDULED' : 'DRAFT',
                    scheduledAt: scheduledDate,
                    userId: brand.userId,
                    brandId: brandId
                }
            });

            if (isScheduled && scheduledDate) {
                const delay = scheduledDate.getTime() - Date.now();
                await campaignQueue.add(
                    'send-campaign',
                    { campaignId: campaign.id },
                    {
                        delay: Math.max(delay, 0),
                        jobId: `campaign-${campaign.id}`
                    }
                );
                console.log(`[Scheduler] 📅 Campaign ${campaign.id} scheduled for ${scheduledDate.toISOString()}`);
            }

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
        const brandId = request.brandId;

        try {
            // Verify campaign belongs to brand
            const existing = await prisma.campaign.findFirst({
                where: { id, ...(brandId ? { brandId } : {}) }
            });

            if (!existing) {
                return reply.status(404).send({ message: 'Campaign not found' });
            }

            const campaign = await prisma.campaign.update({
                where: { id },
                data: { subject, body }
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
        const brandId = request.brandId;

        try {
            const campaign = await prisma.campaign.findFirst({
                where: { id, ...(brandId ? { brandId } : {}) }
            });

            if (!campaign) return reply.status(404).send({ message: 'Campaign not found' });
            if (campaign.status === 'COMPLETED' || campaign.status === 'PROCESSING') {
                return reply.status(400).send({ message: 'Campaign already processing or completed' });
            }

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
        const brandId = request.brandId;

        try {
            const campaign = await prisma.campaign.findFirst({
                where: { id, ...(brandId ? { brandId } : {}) },
                include: {
                    emailLogs: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                        include: { contact: true }
                    }
                }
            });

            if (!campaign) return reply.status(404).send({ message: 'Campaign not found' });

            // Count contacts for this brand
            const totalContacts = await prisma.contact.count({
                where: {
                    status: 'SUBSCRIBED',
                    ...(brandId ? { brandId } : {})
                }
            });
            const failedCount = await prisma.emailLog.count({ where: { campaignId: id, status: 'FAILED' } });

            return {
                status: campaign.status,
                total: totalContacts,
                sent: campaign.sentCount,
                failed: failedCount,
                recentLogs: campaign.emailLogs.map(log => ({
                    email: log.contact.email,
                    status: log.status,
                    time: log.createdAt,
                    error: log.status === 'FAILED' ? log.messageId : null
                }))
            };

        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error fetching stats' });
        }
    });

    // DELETE /campaigns/:id/schedule - Cancel scheduled campaign
    app.delete('/:id/schedule', async (request, reply) => {
        const { id } = request.params as { id: string };
        const brandId = request.brandId;

        try {
            const campaign = await prisma.campaign.findFirst({
                where: { id, ...(brandId ? { brandId } : {}) }
            });

            if (!campaign) return reply.status(404).send({ message: 'Campaign not found' });
            if (campaign.status !== 'SCHEDULED') {
                return reply.status(400).send({ message: 'Campaign is not scheduled' });
            }

            const job = await campaignQueue.getJob(`campaign-${id}`);
            if (job) {
                await job.remove();
                console.log(`[Scheduler] ❌ Cancelled scheduled job for campaign ${id}`);
            }

            await prisma.campaign.update({
                where: { id },
                data: {
                    status: 'DRAFT',
                    scheduledAt: null
                }
            });

            return { message: 'Schedule cancelled successfully' };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error cancelling schedule' });
        }
    });

    // DELETE /campaigns/:id - Delete
    app.delete('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const brandId = request.brandId;

        try {
            const campaign = await prisma.campaign.findFirst({
                where: { id, ...(brandId ? { brandId } : {}) }
            });

            if (!campaign) {
                return reply.status(404).send({ message: 'Campaign not found' });
            }

            const job = await campaignQueue.getJob(`campaign-${id}`);
            if (job) await job.remove();

            await prisma.emailLog.deleteMany({ where: { campaignId: id } });
            await prisma.campaign.delete({ where: { id } });

            return { message: 'Campaign deleted successfully' };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error deleting campaign' });
        }
    });
}
