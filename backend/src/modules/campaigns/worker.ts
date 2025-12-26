import { PrismaClient, WarmupConfig } from '@prisma/client';
import { getTransporter, getSmtpSettings } from '../../lib/mailer';
import { startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

// Calcula fase e limite baseado nos dias desde o início
function calculatePhase(days: number): { phase: number; limit: number | null } {
    if (days >= 22) return { phase: 5, limit: null };  // Ilimitado!
    if (days >= 15) return { phase: 4, limit: 1500 };
    if (days >= 8) return { phase: 3, limit: 500 };
    if (days >= 4) return { phase: 2, limit: 200 };
    return { phase: 1, limit: 50 };
}

// Função helper para reset timezone-safe
async function checkAndResetWarmup(warmupConfig: WarmupConfig): Promise<WarmupConfig> {
    const tz = warmupConfig.timezone || 'America/Sao_Paulo';
    const now = new Date();
    const zonedNow = toZonedTime(now, tz);
    const zonedLastReset = toZonedTime(warmupConfig.lastResetDate, tz);

    const todayStart = startOfDay(zonedNow).getTime();
    const lastResetStart = startOfDay(zonedLastReset).getTime();

    // Se o dia mudou, resetar contador e atualizar fase
    if (todayStart > lastResetStart) {
        const daysSinceStart = warmupConfig.startDate
            ? Math.floor((now.getTime() - warmupConfig.startDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        const { phase, limit } = calculatePhase(daysSinceStart);

        console.log(`[Warmup] 🔄 Novo dia detectado. Atualizando para fase ${phase}, limite ${limit ?? 'ilimitado'}.`);

        const updated = await prisma.warmupConfig.update({
            where: { id: warmupConfig.id },
            data: {
                sentToday: 0,
                lastResetDate: now,
                currentPhase: phase,
                dailyLimit: limit
            }
        });

        return updated;
    }

    return warmupConfig;
}

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

        // --- WARMUP: Buscar config ANTES do loop ---
        let warmupConfig = await prisma.warmupConfig.findFirst();
        if (warmupConfig?.enabled) {
            warmupConfig = await checkAndResetWarmup(warmupConfig);
            console.log(`[Warmup] 🔥 Warmup ativo. Fase ${warmupConfig.currentPhase}, limite ${warmupConfig.dailyLimit ?? 'ilimitado'}, enviados hoje: ${warmupConfig.sentToday}`);
        }

        for (const contact of contacts) {
            // --- WARMUP CHECK: Verificar limite antes de cada envio ---
            if (warmupConfig?.enabled) {
                // Fase 5 = ilimitado (dailyLimit é null)
                if (warmupConfig.dailyLimit !== null && warmupConfig.sentToday >= warmupConfig.dailyLimit) {
                    const resumeMsg = warmupConfig.autoResume
                        ? 'Retomada automática amanhã.'
                        : 'Aguardando ação manual.';

                    console.log(`[Warmup] ⏸️ Limite diário de ${warmupConfig.dailyLimit} atingido na fase ${warmupConfig.currentPhase}. Campanha ${campaignId} pausada. ${resumeMsg}`);

                    await prisma.campaign.update({
                        where: { id: campaignId },
                        data: { status: 'PAUSED' }
                    });

                    break; // Sai do loop
                }
            }


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

                // --- WARMUP: Incrementar contador após envio bem-sucedido ---
                if (warmupConfig?.enabled) {
                    await prisma.warmupConfig.update({
                        where: { id: warmupConfig.id },
                        data: { sentToday: { increment: 1 } }
                    });
                    // Atualizar localmente para próxima iteração
                    warmupConfig.sentToday++;
                }

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
