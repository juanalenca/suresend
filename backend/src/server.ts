import 'dotenv/config';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import fastifyMultipart from '@fastify/multipart';
import { contactsRoutes } from './modules/contacts/contacts.routes';
import { campaignsRoutes } from './modules/campaigns/campaigns.routes';
import { trackingRoutes } from './modules/tracking/tracking.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { unsubscribeRoutes } from './modules/contacts/unsubscribe.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { warmupRoutes } from './modules/warmup/warmup.routes';
import { brandsRoutes } from './modules/brands/brands.routes';
import { brandMiddleware } from './lib/brandMiddleware';
import cors from '@fastify/cors';

// Initialize BullMQ Worker (auto-starts listening for jobs)
import './lib/campaignWorker';

// Initialize Warmup AutoResume Cron
import { startWarmupAutoResumeCron } from './lib/warmupCron';

// Inicializa o Servidor e o Banco
const app = Fastify({ logger: true });
const prisma = new PrismaClient();

// Register plugins
app.register(cors, {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Brand-Id']  // Added X-Brand-Id header
});
app.register(fastifyMultipart);

// Register Brand Middleware (runs before all routes)
app.addHook('preHandler', brandMiddleware);

// Register Routes
app.register(brandsRoutes, { prefix: '/brands' });  // Brand CRUD
app.register(contactsRoutes, { prefix: '/contacts' });
app.register(campaignsRoutes, { prefix: '/campaigns' });
app.register(trackingRoutes);
app.register(dashboardRoutes, { prefix: '/dashboard' });
app.register(unsubscribeRoutes, { prefix: '/unsubscribe' });
app.register(authRoutes, { prefix: '/auth' });
app.register(warmupRoutes, { prefix: '/warmup' });

// Note: Settings routes removed - SMTP config now managed per Brand

// Rota 1: Teste simples (Hello World)
app.get('/', async (request, reply) => {
    return { hello: 'SureSend is Alive!' };
});

// Rota 2: Teste de Conexão com o Banco
app.get('/status', async (request, reply) => {
    try {
        const count = await prisma.user.count();
        return {
            status: 'Database Connected ✅',
            users: count
        };
    } catch (error) {
        app.log.error(error);
        return { status: 'Database Error ❌', error };
    }
});

// Inicia o servidor na porta 3000
const start = async () => {
    try {
        // --- AUTO-FIX: Admin Password Security ---
        const adminEmail = 'admin@suresend.com';
        const securePass = process.env.INITIAL_ADMIN_PASSWORD || '123456';

        const admin = await prisma.user.findUnique({ where: { email: adminEmail } });

        const bcrypt = require('bcryptjs');
        const secureHash = bcrypt.hashSync(securePass, 10);

        if (!admin) {
            console.log('🔒 [Security] Admin user not found. Creating default admin...');
            const newAdmin = await prisma.user.create({
                data: {
                    email: adminEmail,
                    password: secureHash,
                    name: 'Admin'
                }
            });

            // Create default brand for admin
            await prisma.brand.create({
                data: {
                    userId: newAdmin.id,
                    name: 'Default Brand',
                    isDefault: true,
                    emailDelay: 1000
                }
            });
            console.log('✅ [Security] Default admin created with default brand');
        } else {
            if (admin.password === 'hashed_password_placeholder') {
                console.log('⚠️ [Security] Weak admin password detected. Auto-fixing...');
                await prisma.user.update({
                    where: { email: adminEmail },
                    data: { password: secureHash }
                });
                console.log('✅ [Security] Admin password secured.');
            }

            // Ensure admin has a default brand
            const existingBrand = await prisma.brand.findFirst({
                where: { userId: admin.id, isDefault: true }
            });

            if (!existingBrand) {
                await prisma.brand.create({
                    data: {
                        userId: admin.id,
                        name: 'Default Brand',
                        isDefault: true,
                        emailDelay: 1000
                    }
                });
                console.log('✅ [Brands] Created default brand for existing admin');
            }
        }
        // -----------------------------------------

        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log('🚀 Server running at http://localhost:3000');

        // Start cron jobs
        startWarmupAutoResumeCron();
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();