import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to get the transporter dynamically
export async function getTransporter() {
    // 1. Try to fetch settings from DB
    const configs = await prisma.config.findMany({
        where: {
            key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] }
        }
    });

    const settings: Record<string, string> = {};
    configs.forEach((c: { key: string; value: string }) => {
        settings[c.key] = c.value;
    });

    // Check if we have enough config in DB
    // We need at least host, user, pass. Port defaults to 587 if not set? 
    if (settings['smtp_host'] && settings['smtp_user'] && settings['smtp_pass']) {
        console.log('📧 Using Database SMTP Settings');
        return nodemailer.createTransport({
            host: settings['smtp_host'],
            port: Number(settings['smtp_port']) || 587,
            auth: {
                user: settings['smtp_user'],
                pass: settings['smtp_pass'],
            },
        });
    }

    // 2. Fallback to Environment Variables
    console.log('📧 Using Environment (.env) SMTP Settings');
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 2525,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// Deprecated: existing static transporter (kept for backward compat until refactor complete, 
// but we will overwrite the file so it's gone. 
// Worker needs to be updated immediately after this file change.)