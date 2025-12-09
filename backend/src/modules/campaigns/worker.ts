import { PrismaClient } from '@prisma/client';
import { getTransporter } from '../../lib/mailer';

const prisma = new PrismaClient();

export async function processCampaignSending(campaignId: string) {
    try {
        console.log(`[Worker] Starting campaign ${campaignId}`);

        // 1. Update status to PROCESSING
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'PROCESSING' }
        });

        // 2. Fetch Campaign details
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId }
        });

        if (!campaign) {
            console.error(`[Worker] Campaign ${campaignId} not found`);
            return;
        }

        // 3. Fetch All Subscribed Contacts
        // In a real app, we would filter by list/tags
        const contacts = await prisma.contact.findMany({
            where: { status: 'SUBSCRIBED' }
        });

        console.log(`[Worker] Found ${contacts.length} contacts to send.`);

        // Fetch Rate Limit Config
        const delayConfig = await prisma.config.findUnique({ where: { key: 'email_delay' } });
        const delayMs = delayConfig?.value ? parseInt(delayConfig.value) : 1000;
        console.log(`[Worker] Using Rate Limit Delay: ${delayMs}ms`);

        let sentCount = 0;
        let failedCount = 0;

        // 4. Iterate and Send
        for (const contact of contacts) {
            try {
                // Rate Limiting (Configurable)
                await new Promise(r => setTimeout(r, delayMs));

                // 4.1. Create Log PENDING
                const emailLog = await prisma.emailLog.create({
                    data: {
                        campaignId: campaign.id,
                        contactId: contact.id,
                        status: 'PENDING'
                    }
                });

                // 4.2. Generate Tracking Pixel
                const trackingUrl = `${process.env.API_URL || 'http://localhost:3000'}/track/${emailLog.id}/open`;
                const trackingPixel = `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:none" />`;

                const unsubLink = `${process.env.APP_URL || 'http://localhost:5173'}/unsubscribe/${contact.unsubscribeToken}`;
                const footer = `<hr><p style="font-size:12px; color: #666; font-family: sans-serif;">Deseja parar de receber estes e-mails? <a href="${unsubLink}" style="color: #666;">Cancelar inscrição</a>.</p>`;

                // 4.3. Inject Pixel & Footer
                const htmlWithPixel = campaign.body.replace('{{name}}', contact.name || 'Friend') + trackingPixel + footer;

                // 4.4. Send Email
                const transporter = await getTransporter();
                const info = await transporter.sendMail({
                    from: `"SureSend" <${process.env.SMTP_USER || 'no-reply@suresend.com'}>`,
                    to: contact.email,
                    subject: campaign.subject,
                    html: htmlWithPixel
                });

                // 4.5. Update Log to SENT
                await prisma.emailLog.update({
                    where: { id: emailLog.id },
                    data: {
                        status: 'SENT',
                        messageId: info.messageId
                    }
                });

                sentCount++;

                // Update counter
                await prisma.campaign.update({
                    where: { id: campaignId },
                    data: { sentCount: { increment: 1 } }
                });


            } catch (err: any) {
                console.error(`[Worker] Failed to send to ${contact.email}:`, err.message);

                // If log was created, update it. If not, create a FAILED one.
                // Simplified: We assume create might have failed or send failed.
                // But if we are here, we might not have 'emailLog' in scope if it failed at creation.
                // Let's just create a new FAILED log for simplicity or try-catch inside.
                // Actually, to keep it robust:

                await prisma.emailLog.create({
                    data: {
                        campaignId: campaign.id,
                        contactId: contact.id,
                        status: 'FAILED',
                        messageId: err.message
                    }
                });

                failedCount++;
            }
        }

        // 5. Finish
        await prisma.campaign.update({
            where: { id: campaignId },
            data: {
                status: 'COMPLETED',
                // sentCount is already updated incrementaly
            }
        });

        console.log(`[Worker] Campaign ${campaignId} finished. Sent: ${sentCount}, Failed: ${failedCount}`);

    } catch (error) {
        console.error('[Worker] Fatal error:', error);
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'FAILED' }
        });
    }
}
