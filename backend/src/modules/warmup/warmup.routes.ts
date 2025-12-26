import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Calcula fase e limite baseado nos dias desde o início
function calculatePhase(days: number): { phase: number; limit: number | null } {
    if (days >= 22) return { phase: 5, limit: null };  // Ilimitado!
    if (days >= 15) return { phase: 4, limit: 1500 };
    if (days >= 8) return { phase: 3, limit: 500 };
    if (days >= 4) return { phase: 2, limit: 200 };
    return { phase: 1, limit: 50 };
}

export async function warmupRoutes(app: FastifyInstance) {
    // Helper para obter ou criar config
    const getOrCreateConfig = async () => {
        let config = await prisma.warmupConfig.findFirst();
        if (!config) {
            config = await prisma.warmupConfig.create({
                data: {
                    enabled: false,
                    currentPhase: 1,
                    dailyLimit: 50,
                    sentToday: 0,
                    autoResume: false
                }
            });
        }
        return config;
    };

    // GET /warmup - Buscar configuração atual
    app.get('/', async (request, reply) => {
        try {
            const config = await getOrCreateConfig();

            // Calcular dias desde início (se existir)
            let daysSinceStart = 0;
            if (config.startDate) {
                daysSinceStart = Math.floor(
                    (Date.now() - config.startDate.getTime()) / (1000 * 60 * 60 * 24)
                );
            }

            return {
                ...config,
                daysSinceStart
            };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error fetching warmup config' });
        }
    });

    // POST /warmup/start - Iniciar warmup
    app.post('/start', async (request, reply) => {
        try {
            const config = await getOrCreateConfig();

            const updated = await prisma.warmupConfig.update({
                where: { id: config.id },
                data: {
                    enabled: true,
                    startDate: new Date(),
                    currentPhase: 1,
                    dailyLimit: 50,
                    sentToday: 0,
                    lastResetDate: new Date()
                }
            });

            console.log('[Warmup] 🔥 Warmup iniciado!');
            return updated;
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error starting warmup' });
        }
    });

    // POST /warmup/stop - Pausar warmup
    app.post('/stop', async (request, reply) => {
        try {
            const config = await getOrCreateConfig();

            const updated = await prisma.warmupConfig.update({
                where: { id: config.id },
                data: { enabled: false }
            });

            console.log('[Warmup] ⏸️ Warmup pausado.');
            return updated;
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error stopping warmup' });
        }
    });

    // POST /warmup/reset - Reiniciar do zero
    app.post('/reset', async (request, reply) => {
        try {
            const config = await getOrCreateConfig();

            const updated = await prisma.warmupConfig.update({
                where: { id: config.id },
                data: {
                    enabled: false,
                    startDate: null,
                    currentPhase: 1,
                    dailyLimit: 50,
                    sentToday: 0,
                    lastResetDate: new Date()
                }
            });

            console.log('[Warmup] 🔄 Warmup resetado.');
            return updated;
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error resetting warmup' });
        }
    });

    // PUT /warmup - Atualizar configurações (timezone, autoResume)
    app.put('/', async (request, reply) => {
        const { timezone, autoResume } = request.body as {
            timezone?: string;
            autoResume?: boolean;
        };

        try {
            const config = await getOrCreateConfig();

            const updated = await prisma.warmupConfig.update({
                where: { id: config.id },
                data: {
                    ...(timezone !== undefined && { timezone }),
                    ...(autoResume !== undefined && { autoResume })
                }
            });

            return updated;
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error updating warmup' });
        }
    });
}

// Export da função calculatePhase para uso no worker
export { calculatePhase };
