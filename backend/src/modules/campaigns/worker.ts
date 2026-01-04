import { PrismaClient, WarmupConfig } from '@prisma/client';
import { getTransporter } from '../../lib/mailer';
import { decryptPassword } from '../../lib/crypto';
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

// Buscar configurações SMTP da Brand
async function getBrandSmtpSettings(brandId: string) {
    const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        select: {
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPass: true,
            fromEmail: true,
            emailDelay: true
        }
    });

    if (!brand) {
        throw new Error(`Brand ${brandId} not found`);
    }

    // Decrypt password before using
    const decryptedPass = brand.smtpPass ? decryptPassword(brand.smtpPass) : '';

    return {
        host: brand.smtpHost || process.env.SMTP_HOST || 'localhost',
        port: parseInt(brand.smtpPort || process.env.SMTP_PORT || '587', 10),
        user: brand.smtpUser || process.env.SMTP_USER || '',
        pass: decryptedPass || process.env.SMTP_PASS || '',
        from: brand.fromEmail || process.env.SMTP_FROM || 'noreply@example.com',
        delay: brand.emailDelay || 1000
    };
}

// Criar transporter com configurações da Brand
async function getTransporterForBrand(brandId: string) {
    const settings = await getBrandSmtpSettings(brandId);
    const nodemailer = require('nodemailer');

    return nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        auth: {
            user: settings.user,
            pass: settings.pass
        }
    });
}

export async function processCampaignSending(campaignId: string) {
    try {
        console.log(`[Worker] Starting campaign ${campaignId}`);

        // 1. Fetch Campaign details
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            include: { brand: true }
        });

        if (!campaign) {
            console.error(`[Worker] Campaign ${campaignId} not found`);
            return;
        }

        const brandId = campaign.brandId;

        // 2. Update status to PROCESSING
        if (campaign.status !== 'PROCESSING') {
            await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: 'PROCESSING' }
            });
        }

        // 3. Fetch contacts for this brand only
        const contacts = await prisma.contact.findMany({
            where: {
                status: 'SUBSCRIBED',
                brandId: brandId
            }
        });

        console.log(`[Worker] Found ${contacts.length} contacts for brand ${brandId}.`);

        // 4. Get SMTP settings from Brand
        const settings = await getBrandSmtpSettings(brandId);
        const transporter = await getTransporterForBrand(brandId);

        console.log(`[Worker] Using Brand SMTP: ${settings.host}:${settings.port}`);
        console.log(`[Worker] Using Rate Limit Delay: ${settings.delay}ms`);

        let sentCount = 0;
        let failedCount = 0;

        // --- WARMUP: Buscar config para esta brand ---
        let warmupConfig = await prisma.warmupConfig.findUnique({
            where: { brandId }
        });

        if (warmupConfig?.enabled) {
            warmupConfig = await checkAndResetWarmup(warmupConfig);
            console.log(`[Warmup] 🔥 Warmup ativo para brand ${brandId}. Fase ${warmupConfig.currentPhase}, limite ${warmupConfig.dailyLimit ?? 'ilimitado'}, enviados hoje: ${warmupConfig.sentToday}`);
        }

        for (const contact of contacts) {
            // --- WARMUP CHECK ---
            if (warmupConfig?.enabled) {
                if (warmupConfig.dailyLimit !== null && warmupConfig.sentToday >= warmupConfig.dailyLimit) {
                    const resumeMsg = warmupConfig.autoResume
                        ? 'Retomada automática amanhã.'
                        : 'Aguardando ação manual.';

                    console.log(`[Warmup] ⏸️ Limite diário de ${warmupConfig.dailyLimit} atingido na fase ${warmupConfig.currentPhase}. Campanha ${campaignId} pausada. ${resumeMsg}`);

                    await prisma.campaign.update({
                        where: { id: campaignId },
                        data: { status: 'PAUSED', pausedByWarmup: true }
                    });

                    break;
                }
            }

            try {
                const emailLog = await prisma.emailLog.create({
                    data: {
                        campaignId: campaign.id,
                        contactId: contact.id,
                        status: 'PENDING'
                    }
                });

                const trackingUrl = `${process.env.API_URL || 'http://localhost:3000'}/track/${emailLog.id}/open`;
                const trackingPixel = `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:none" />`;

                const unsubLink = `${process.env.APP_URL || 'http://localhost:5173'}/unsubscribe/${contact.unsubscribeToken}`;
                const footer = `<hr><p style="font-size:12px; color: #666; font-family: sans-serif;">Deseja parar de receber estes e-mails? <a href="${unsubLink}" style="color: #666;">Cancelar inscrição</a>.</p>`;

                const htmlWithPixel = campaign.body.replace('{{name}}', contact.name || 'Friend') + trackingPixel + footer;

                const info = await transporter.sendMail({
                    from: settings.from,
                    to: contact.email,
                    subject: campaign.subject,
                    html: htmlWithPixel
                });

                await prisma.emailLog.update({
                    where: { id: emailLog.id },
                    data: {
                        status: 'SENT',
                        messageId: info.messageId
                    }
                });

                sentCount++;
                console.log(`[Worker] ✅ SENT - ${contact.email}`);

                await prisma.campaign.update({
                    where: { id: campaignId },
                    data: { sentCount: { increment: 1 } }
                });

                // --- WARMUP: Incrementar contador após envio ---
                if (warmupConfig?.enabled) {
                    await prisma.warmupConfig.update({
                        where: { id: warmupConfig.id },
                        data: { sentToday: { increment: 1 } }
                    });
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

                if (errorMessage.toLowerCase().includes('limit') || errorMessage.toLowerCase().includes('too many')) {
                    console.warn(`[Worker] ⚠️ Rate limit detected! Applying 5s PENALTY before next contact...`);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }

            await new Promise(r => setTimeout(r, settings.delay));
        }

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
