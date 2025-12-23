import { PrismaClient } from '@prisma/client';
import { getTransporter, getSmtpSettings } from '../../lib/mailer';

const prisma = new PrismaClient();

export async function processCampaignSending(campaignId: string) {
    try {
        console.log(`[Worker] Starting campaign ${campaignId}`);

        // 1. Fetch Campaign details FIRST to check status
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId }
        });

        if (!campaign) {
            console.error(`[Worker] Campaign ${campaignId} not found`);
            return;
        }

        // Note: PROCESSING check removed because BullMQ already handles concurrency
        // and sets status to PROCESSING before calling this function
        // Valid states to process: DRAFT, SCHEDULED, or already PROCESSING (from BullMQ)

        // 2. Update status to PROCESSING (if not already set by BullMQ worker)
        if (campaign.status !== 'PROCESSING') {
            await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: 'PROCESSING' }
            });
        }

        // 3. Fetch All Subscribed Contacts
        const contacts = await prisma.contact.findMany({
            where: { status: 'SUBSCRIBED' }
        });

        console.log(`[Worker] Found ${contacts.length} contacts to send.`);

        // Fetch SMTP Settings once
        const settings = await getSmtpSettings();
        const transporter = await getTransporter();

        console.log(`[Worker] Using Rate Limit Delay: ${settings.delay}ms`);

        let sentCount = 0;
        let failedCount = 0;

        for (const contact of contacts) {

            try {
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

                // 4.4. Send Email (SINGLE ATTEMPT - NO RETRIES)
                const info = await transporter.sendMail({
                    from: settings.from,
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
                console.log(`[Worker] ✅ SENT - ${contact.email}`);

                // Update counter
                await prisma.campaign.update({
                    where: { id: campaignId },
                    data: { sentCount: { increment: 1 } }
                });

            } catch (err: any) {
                const errorMessage = err.message || 'Unknown error';
                console.log(`[Worker] ❌ FAIL - ${contact.email} - ${errorMessage}`);

                await prisma.emailLog.create({
                    data: {
                        campaignId: campaign.id,
                        contactId: contact.id,
                        status: 'FAILED',
                        messageId: errorMessage
                    }
                });

                failedCount++;

                // --- SMART BACKOFF (PENALTY BOX) ---
                // If rate limit reached, wait extra time before continuing
                if (errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('too many')) {
                    console.warn(`[Worker] ⚠️ Rate limit detected! Applying 5s PENALTY before next contact...`);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }

            // --- COMPASS DELAY (ALWAYS EXECUTED - OUTSIDE TRY/CATCH) ---
            await new Promise(r => setTimeout(r, settings.delay));
        }

        // 5. Finish
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'COMPLETED' }
        });

        console.log(`[Worker] 🏁 Campaign ${campaignId} finished. Sent: ${sentCount}, Failed: ${failedCount}`);

    } catch (error) {
        console.error('[Worker] Fatal error:', error);
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'FAILED' }
        });
    }
}
