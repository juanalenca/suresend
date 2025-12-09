import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function dashboardRoutes(app: FastifyInstance) {
    app.get('/stats', async (request, reply) => {
        try {
            // 1. Total Contacts
            const totalContacts = await prisma.contact.count({
                where: { status: { not: 'DELETED' } } // Assuming we might have deleted status, or just count all
            });

            // 2. Sent Emails (Sent + Opened + Clicked)
            // Basically anything that successfully left the worker.
            const sentEmails = await prisma.emailLog.count({
                where: {
                    status: { in: ['SENT', 'OPENED', 'CLICKED'] }
                }
            });

            // 3. Opened Emails
            const openedEmails = await prisma.emailLog.count({
                where: {
                    status: { in: ['OPENED', 'CLICKED'] }
                }
            });

            // 4. Open Rate
            const openRate = sentEmails > 0 ? (openedEmails / sentEmails) * 100 : 0;

            return {
                totalContacts,
                sentEmails,
                openRate: parseFloat(openRate.toFixed(1)), // 1 decimal place
                serverStatus: 'Online'
            };

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            reply.status(500).send({ error: 'Failed to fetch stats' });
        }
    });
}
