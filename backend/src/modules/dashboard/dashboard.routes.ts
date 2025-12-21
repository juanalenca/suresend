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

            // Format contact activities with human-readable messages
            const contactActivities = recentContacts.map(c => {
                const displayName = c.name || c.email.split('@')[0];
                return {
                    id: c.id,
                    type: 'contact_added' as const,
                    iconType: 'user_plus', // Frontend will use UserPlus icon
                    text: `${displayName} added to your list`,
                    subtext: c.email,
                    link: `/contacts`,
                    createdAt: c.createdAt
                };
            });

            // Format campaign activities with contextual messages
            const campaignActivities = recentCampaigns.map(c => {
                const campaignName = c.name || c.subject || 'Untitled';

                let text = '';
                let subtext = '';
                let iconType = 'send';

                switch (c.status) {
                    case 'COMPLETED':
                        text = `Campaign "${campaignName}" completed`;
                        subtext = `Sent to ${c.sentCount} contact${c.sentCount !== 1 ? 's' : ''}`;
                        iconType = 'check_circle';
                        break;
                    case 'RUNNING':
                    case 'PROCESSING':
                        text = `Campaign "${campaignName}" is sending`;
                        subtext = `${c.sentCount} sent so far...`;
                        iconType = 'send';
                        break;
                    case 'FAILED':
                        text = `Campaign "${campaignName}" failed`;
                        subtext = 'Check your SMTP settings';
                        iconType = 'alert_circle';
                        break;
                    case 'PENDING':
                        text = `Campaign "${campaignName}" queued`;
                        subtext = 'Waiting to start';
                        iconType = 'clock';
                        break;
                    default:
                        text = `Campaign "${campaignName}"`;
                        subtext = c.status;
                        iconType = 'send';
                }

                return {
                    id: c.id,
                    type: 'campaign' as const,
                    iconType,
                    text,
                    subtext,
                    link: `/campaigns`,
                    status: c.status,
                    createdAt: c.createdAt
                };
            });

            // Combine, sort by date, take top 5 most recent
            const recentActivity = [...contactActivities, ...campaignActivities]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map(activity => {
                    // Calculate human-readable relative time
                    const now = new Date();
                    const activityDate = new Date(activity.createdAt);
                    const diffMs = now.getTime() - activityDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    let timeAgo = '';
                    if (diffDays >= 1) {
                        timeAgo = diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
                    } else if (diffHours >= 1) {
                        timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
                    } else if (diffMins >= 1) {
                        timeAgo = diffMins === 1 ? '1 min ago' : `${diffMins} mins ago`;
                    } else {
                        timeAgo = 'Just now';
                    }

                    return {
                        id: activity.id,
                        type: activity.type,
                        iconType: activity.iconType,
                        text: activity.text,
                        subtext: activity.subtext,
                        link: activity.link,
                        timeAgo
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
