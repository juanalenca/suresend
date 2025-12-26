import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to get SMTP settings with fallback
export async function getSmtpSettings() {
    const configs = await prisma.config.findMany({
        where: {
            key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'email_delay'] }
        }
    });

    const settings: Record<string, string> = {};
    configs.forEach((c: { key: string; value: string }) => {
        settings[c.key] = c.value;
    });

    const host = settings['smtp_host'] || process.env.SMTP_HOST;
    const port = Number(settings['smtp_port']) || Number(process.env.SMTP_PORT) || 587;
    const user = settings['smtp_user'] || process.env.SMTP_USER;
    const pass = settings['smtp_pass'] || process.env.SMTP_PASS;
    const from = settings['smtp_from'] || process.env.SMTP_FROM || 'no-reply@suresend.com';
    const delay = Number(settings['email_delay']);

    return {
        host,
        port,
        user,
        pass,
        from,
        delay: (delay && delay > 0) ? delay : 1000 // Fallback to 1000ms
    };
}

// Function to get the transporter dynamically
export async function getTransporter() {
    const settings = await getSmtpSettings();

    if (settings.host && settings.user && settings.pass) {
        console.log(`📧 Using SMTP Settings: ${settings.host}:${settings.port}`);
        return nodemailer.createTransport({
            pool: true, // Use pooled connection
            maxConnections: 1, // Force single connection
            maxMessages: 100, // Reuse connection for up to 100 messages
            host: settings.host,
            port: settings.port,
            secure: settings.port === 465, // true for 465, false for other ports
            auth: {
                user: settings.user,
                pass: settings.pass,
            },
            tls: {
                // Não rejeitar certificados inválidos (necessário para alguns provedores)
                rejectUnauthorized: false
            }
        });
    }

    throw new Error('SMTP settings are incomplete (missing host, user or pass)');
}

// Deprecated: existing static transporter (kept for backward compat until refactor complete, 
// but we will overwrite the file so it's gone. 
// Worker needs to be updated immediately after this file change.)