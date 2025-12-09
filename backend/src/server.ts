import 'dotenv/config';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import fastifyMultipart from '@fastify/multipart';
import { contactsRoutes } from './modules/contacts/contacts.routes';
import { campaignsRoutes } from './modules/campaigns/campaigns.routes';
import { trackingRoutes } from './modules/tracking/tracking.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { settingsRoutes } from './modules/settings/settings.routes';
import { unsubscribeRoutes } from './modules/contacts/unsubscribe.routes';
import { authRoutes } from './modules/auth/auth.routes';
import cors from '@fastify/cors';

// Inicializa o Servidor e o Banco
const app = Fastify({ logger: true });
const prisma = new PrismaClient();

// Register plugins
app.register(cors, {
    origin: ['http://localhost:5173', 'http://localhost:3000'], // Allow Frontend and local calls
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
});
app.register(fastifyMultipart);

// Register Routes
app.register(contactsRoutes, { prefix: '/contacts' });
app.register(campaignsRoutes, { prefix: '/campaigns' });
app.register(trackingRoutes);
app.register(dashboardRoutes, { prefix: '/dashboard' });
app.register(settingsRoutes, { prefix: '/settings' });
app.register(unsubscribeRoutes, { prefix: '/unsubscribe' });
app.register(authRoutes, { prefix: '/auth' });

// Rota 1: Teste simples (Hello World)
app.get('/', async (request, reply) => {
    return { hello: 'SureSend is Alive!' };
});

// Rota 2: Teste de Conexão com o Banco
app.get('/status', async (request, reply) => {
    try {
        // Tenta contar quantos usuários existem (deve ser 0)
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
// Inicia o servidor na porta 3000
const start = async () => {
    try {
        // --- AUTO-FIX: Admin Password Security ---
        const adminEmail = 'admin@suresend.com';
        const securePass = process.env.INITIAL_ADMIN_PASSWORD || '123456';

        // Check if admin exists
        const admin = await prisma.user.findUnique({ where: { email: adminEmail } });

        // Use bcrypt to hash the secure password
        // We import bcrypt dynamically or use the one from auth if available? 
        // Better to require it here for the script.
        const bcrypt = require('bcryptjs');
        const secureHash = bcrypt.hashSync(securePass, 10);

        if (!admin) {
            console.log('🔒 [Security] Admin user not found. Creating default admin...');
            await prisma.user.create({
                data: {
                    email: adminEmail,
                    password: secureHash,
                    name: 'Admin Secure'
                }
            });
            console.log('✅ [Security] Default admin created: admin@suresend.com / 123456');
        } else {
            // Check if password is "hashed_password_placeholder" or weak
            // Note: In a real scenario we might not know if it's the placeholder hash unless we check the string explicitly
            // The user request says: "If exists AND password is equal to 'hashed_password_placeholder'..."
            // For robustness, let's just ensure it IS the secure hash if it matches the 'placeholder' logic 
            // OR if we want to force reset it for this "Auto-Fix" task.
            // Let's implement exactly what was asked: check for placeholder.
            // But wait, my previous code didn't use "hashed_password_placeholder", it used a real hash.
            // However, the user prompt implies there MIGHT be a placeholder.
            // Let's be safe: If the user exists, we log that it exists. 
            // If the user wants to force update, we can.
            // The prompt says: "Substitua a senha fixa `hashed_password_placeholder` por um hash real."
            // "Adicione uma lógica... Ao iniciar, verifique se... existe... e a senha for igual a `hashed_password_placeholder`, faça UPDATE".

            if (admin.password === 'hashed_password_placeholder') {
                console.log('⚠️ [Security] Weak admin password detected. Auto-fixing...');
                await prisma.user.update({
                    where: { email: adminEmail },
                    data: { password: secureHash }
                });
                console.log('✅ [Security] Admin password secured.');
            }
        }
        // -----------------------------------------

        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log('🚀 Server running at http://localhost:3000');
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();