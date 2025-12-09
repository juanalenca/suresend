import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function settingsRoutes(app: FastifyInstance) {

    // GET /settings - Retrieve current configuration
    app.get('/', async (request, reply) => {
        try {
            const configs = await prisma.config.findMany({
                where: {
                    key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_from', 'email_delay'] }
                }
            });

            // Convert array to object
            const settings: Record<string, string> = {};
            configs.forEach((c: { key: string; value: string }) => {
                settings[c.key] = c.value;
            });

            return {
                host: settings['smtp_host'] || '',
                port: settings['smtp_port'] || '',
                user: settings['smtp_user'] || '',
                fromEmail: settings['smtp_from'] || '',
                emailDelay: settings['email_delay'] || '1000',
                // Pass is masked or empty
                pass: ''
            };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ error: 'Failed to fetch settings' });
        }
    });

    // POST /settings - Update configuration
    app.post('/', async (request, reply) => {
        const { host, port, user, pass, fromEmail, emailDelay } = request.body as any;

        try {
            // Helper to upsert
            const upsertConfig = async (key: string, value: string) => {
                if (value === undefined || value === null) return;

                await prisma.config.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) }
                });
            };

            await upsertConfig('smtp_host', host);
            await upsertConfig('smtp_port', port);
            await upsertConfig('smtp_user', user);
            await upsertConfig('smtp_from', fromEmail);
            await upsertConfig('email_delay', emailDelay);

            // Only update password if provided (non-empty)
            if (pass && pass.trim() !== '') {
                await upsertConfig('smtp_pass', pass);
            }

            return { status: 'Settings saved' };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ error: 'Failed to save settings' });
        }
    });
}
