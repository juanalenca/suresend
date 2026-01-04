import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { decryptPassword } from './crypto';

const prisma = new PrismaClient();

/**
 * Get SMTP settings for a specific brand
 * This is the primary way to get SMTP settings in multi-brand mode.
 */
export async function getBrandSmtpSettings(brandId: string) {
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

    // Decrypt password if stored encrypted
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

/**
 * Get transporter for a specific brand
 */
export async function getTransporterForBrand(brandId: string) {
    const settings = await getBrandSmtpSettings(brandId);

    if (!settings.host || !settings.user || !settings.pass) {
        throw new Error(`SMTP settings incomplete for brand ${brandId}`);
    }

    console.log(`📧 Using SMTP Settings for brand: ${settings.host}:${settings.port}`);

    return nodemailer.createTransport({
        pool: true,
        maxConnections: 1,
        maxMessages: 100,
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        auth: {
            user: settings.user,
            pass: settings.pass,
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}

/**
 * Legacy function - kept for compatibility
 * Falls back to environment variables only
 * @deprecated Use getBrandSmtpSettings instead
 */
export async function getSmtpSettings() {
    return {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'noreply@example.com',
        delay: 1000
    };
}

/**
 * Legacy function - kept for compatibility
 * @deprecated Use getTransporterForBrand instead
 */
export async function getTransporter() {
    const settings = await getSmtpSettings();

    if (settings.host && settings.user && settings.pass) {
        return nodemailer.createTransport({
            pool: true,
            maxConnections: 1,
            maxMessages: 100,
            host: settings.host,
            port: settings.port,
            secure: settings.port === 465,
            auth: {
                user: settings.user,
                pass: settings.pass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    throw new Error('SMTP settings are incomplete (missing host, user or pass)');
}