/**
 * Warmup AutoResume Cron Job
 * 
 * Roda a cada 5 minutos para verificar se campanhas pausadas por limite
 * de warmup devem ser retomadas automaticamente.
 * 
 * Now works with multi-brand: iterates through each brand's warmup config.
 */
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

/**
 * Executa a lógica de auto-resume.
 * Exportada para permitir execução manual durante testes.
 */
export async function runAutoResumeCron() {
    try {
        // Buscar todas configs com autoResume habilitado (por brand)
        const configs = await prisma.warmupConfig.findMany({
            where: { enabled: true, autoResume: true },
            include: { brand: true }
        });

        if (configs.length === 0) {
            console.log('[Warmup Cron] Nenhuma config com autoResume=true');
            return { processed: 0, resumed: 0 };
        }

        // Filtrar configs que já verificaram hoje
        const configsToProcess: typeof configs = [];
        const now = new Date();

        for (const config of configs) {
            const tz = config.timezone || 'America/Sao_Paulo';
            const zonedNow = toZonedTime(now, tz);
            const todayStart = startOfDay(zonedNow);

            // Se já verificou hoje, pula
            if (config.lastAutoResumeCheck) {
                const lastCheck = toZonedTime(config.lastAutoResumeCheck, tz);
                if (startOfDay(lastCheck).getTime() === todayStart.getTime()) {
                    console.log(`[Warmup Cron] Config ${config.id} (brand: ${config.brand.name}) já verificada hoje, pulando`);
                    continue;
                }
            }

            // Só processa se sentToday foi resetado (= 0)
            if (config.sentToday === 0) {
                configsToProcess.push(config);
            } else {
                console.log(`[Warmup Cron] Config ${config.id}: sentToday=${config.sentToday}, não é novo dia ainda`);
            }
        }

        if (configsToProcess.length === 0) {
            console.log('[Warmup Cron] Nenhuma config para processar (já verificadas ou sentToday > 0)');
            return { processed: 0, resumed: 0 };
        }

        // Buscar campanhas pausadas por warmup para as brands sendo processadas
        const brandIds = configsToProcess.map(c => c.brandId);

        const campaigns = await prisma.campaign.findMany({
            where: {
                status: 'PAUSED',
                pausedByWarmup: true,
                brandId: { in: brandIds }
            },
            select: { id: true, name: true, brandId: true }
        });

        let resumedCount = 0;
        if (campaigns.length > 0) {
            // Único updateMany para retomar
            await prisma.campaign.updateMany({
                where: { id: { in: campaigns.map(c => c.id) } },
                data: { status: 'SCHEDULED', pausedByWarmup: false }
            });

            resumedCount = campaigns.length;
            console.log(`[Warmup Cron] ✅ Retomadas ${campaigns.length} campanhas automaticamente: ${campaigns.map(c => c.name || c.id).join(', ')}`);
        } else {
            console.log('[Warmup Cron] Nenhuma campanha pausada por warmup encontrada para as brands processadas');
        }

        // Atualizar lastAutoResumeCheck para todas configs processadas
        await prisma.warmupConfig.updateMany({
            where: { id: { in: configsToProcess.map(c => c.id) } },
            data: { lastAutoResumeCheck: now }
        });

        return { processed: configsToProcess.length, resumed: resumedCount };

    } catch (error) {
        console.error('[Warmup Cron] ❌ Erro no cron de autoResume:', error);
        throw error;
    }
}

export function startWarmupAutoResumeCron() {
    // Roda a cada 5 minutos
    cron.schedule('*/5 * * * *', runAutoResumeCron);
    console.log('⏰ Warmup AutoResume Cron iniciado (verifica a cada 5 min)');
}
