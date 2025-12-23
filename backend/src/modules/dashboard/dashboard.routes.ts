import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function dashboardRoutes(app: FastifyInstance) {
    // Basic stats endpoint (keeping for backwards compatibility)
    app.get('/stats', async (request, reply) => {
        try {
            // 1. Total Contacts
            const totalContacts = await prisma.contact.count({
                where: { status: { not: 'DELETED' } }
            });

            // 2. Sent Emails (Sent + Opened + Clicked)
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
                openRate: parseFloat(openRate.toFixed(1)),
                serverStatus: 'Online'
            };

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            reply.status(500).send({ error: 'Failed to fetch stats' });
        }
    });

    // Comprehensive summary endpoint with all dashboard data
    app.get('/summary', async (request, reply) => {
        try {
            // 1. Total Contacts
            const totalContacts = await prisma.contact.count({
                where: { status: { not: 'DELETED' } }
            });

            // 2. Active Campaigns (RUNNING, PENDING, or PROCESSING)
            const activeCampaigns = await prisma.campaign.count({
                where: {
                    status: { in: ['RUNNING', 'PENDING', 'PROCESSING'] }
                }
            });

            // 3. Emails Sent
            const emailsSent = await prisma.emailLog.count({
                where: {
                    status: { in: ['SENT', 'OPENED', 'CLICKED'] }
                }
            });

            // 4. Opened Emails for open rate calculation
            const openedEmails = await prisma.emailLog.count({
                where: {
                    status: { in: ['OPENED', 'CLICKED'] }
                }
            });
            const openRate = emailsSent > 0 ? (openedEmails / emailsSent) * 100 : 0;

            // 5. Recent Activity - Real data only, formatted for humans
            const recentContacts = await prisma.contact.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true
                }
            });

            const recentCampaigns = await prisma.campaign.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                where: { status: { not: 'DRAFT' } },
                select: {
                    id: true,
                    name: true,
                    subject: true,
                    status: true,
                    createdAt: true,
                    sentCount: true
                }
            });

            // Format contact activities with structured data for i18n
            const contactActivities = recentContacts.map(c => {
                const displayName = c.name || c.email.split('@')[0];
                return {
                    id: c.id,
                    type: 'contact_added' as const,
                    iconType: 'user_plus',
                    // Structured data for translation
                    name: displayName,
                    email: c.email,
                    link: `/contacts`,
                    createdAt: c.createdAt
                };
            });

            // Format campaign activities with structured data for i18n
            const campaignActivities = recentCampaigns.map(c => {
                const campaignName = c.name || c.subject || 'Untitled';

                return {
                    id: c.id,
                    type: 'campaign' as const,
                    iconType: c.status === 'COMPLETED' ? 'check_circle' :
                        c.status === 'FAILED' ? 'alert_circle' :
                            c.status === 'PENDING' || c.status === 'SCHEDULED' ? 'clock' : 'send',
                    // Structured data for translation
                    name: campaignName,
                    status: c.status,
                    sentCount: c.sentCount,
                    link: `/campaigns`,
                    createdAt: c.createdAt
                };
            });

            // Combine, sort by date, take top 5 most recent
            const recentActivity = [...contactActivities, ...campaignActivities]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map(activity => {
                    // Calculate human-readable relative time key
                    const now = new Date();
                    const activityDate = new Date(activity.createdAt);
                    const diffMs = now.getTime() - activityDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    // Return structured time data for frontend translation
                    let timeAgoKey = '';
                    let timeAgoCount = 0;

                    if (diffDays >= 1) {
                        timeAgoKey = diffDays === 1 ? 'yesterday' : 'days_ago';
                        timeAgoCount = diffDays;
                    } else if (diffHours >= 1) {
                        timeAgoKey = diffHours === 1 ? 'hour_ago' : 'hours_ago';
                        timeAgoCount = diffHours;
                    } else if (diffMins >= 1) {
                        timeAgoKey = 'min_ago';
                        timeAgoCount = diffMins;
                    } else {
                        timeAgoKey = 'just_now';
                        timeAgoCount = 0;
                    }

                    return {
                        ...activity,
                        timeAgoKey,
                        timeAgoCount
                    };
                });

            // 6. Contact Stats - Group by month (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const contactsByMonth = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
                SELECT 
                    TO_CHAR("createdAt", 'Mon') as month,
                    COUNT(*) as count
                FROM "Contact"
                WHERE "createdAt" >= ${sixMonthsAgo}
                GROUP BY TO_CHAR("createdAt", 'Mon'), DATE_TRUNC('month', "createdAt")
                ORDER BY DATE_TRUNC('month', "createdAt") ASC
                LIMIT 6
            `;

            const contactStats = contactsByMonth.map(row => ({
                month: row.month,
                contacts: Number(row.count),
                emails: 0 // Can be extended to include email stats per month
            }));

            // If no data, provide empty array (frontend handles this)
            const finalContactStats = contactStats.length > 0 ? contactStats : [];

            return {
                totalContacts,
                activeCampaigns,
                emailsSent,
                openRate: parseFloat(openRate.toFixed(1)),
                serverStatus: 'Online',
                recentActivity,
                contactStats: finalContactStats
            };

        } catch (error) {
            console.error('Error fetching dashboard summary:', error);
            reply.status(500).send({ error: 'Failed to fetch dashboard summary' });
        }
    });
}
