import crypto from 'crypto';

/**
 * SMTP Password Encryption Module
 * 
 * Uses AES-256-GCM for symmetric encryption of SMTP passwords.
 * The encryption key should be stored in environment variable ENCRYPTION_KEY.
 * 
 * Key generation (run once and save):
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;  // For AES, this is always 16
const AUTH_TAG_LENGTH = 16;

/**
 * Get or generate encryption key
 * Uses ENCRYPTION_KEY env var, or generates a deterministic key from JWT_SECRET
 */
function getEncryptionKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;

    if (envKey) {
        // Use provided key (should be 32 bytes hex = 64 chars)
        if (envKey.length === 64) {
            return Buffer.from(envKey, 'hex');
        }
        // If not 64 chars, hash it to get 32 bytes
        return crypto.createHash('sha256').update(envKey).digest();
    }

    // Fallback: derive from JWT_SECRET (not ideal but better than hardcoded)
    const jwtSecret = process.env.JWT_SECRET || 'SUPER_SECRET_JWT_KEY';
    return crypto.createHash('sha256').update(jwtSecret + '_SMTP_ENCRYPTION').digest();
}

/**
 * Encrypt a plaintext password
 * @param plaintext The SMTP password to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (hex encoded)
 */
export function encryptPassword(plaintext: string): string {
    if (!plaintext || plaintext.trim() === '') {
        return '';
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted password
 * @param encrypted The encrypted string from encryptPassword
 * @returns Decrypted plaintext password
 */
export function decryptPassword(encrypted: string): string {
    if (!encrypted || encrypted.trim() === '') {
        return '';
    }

    // Check if it looks like our encrypted format (has two colons)
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
        // Not encrypted (legacy plaintext) - return as-is
        // This allows backward compatibility with existing data
        console.warn('[Crypto] Password appears to be in plaintext format (legacy)');
        return encrypted;
    }

    try {
        const key = getEncryptionKey();
        const [ivHex, authTagHex, ciphertext] = parts;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[Crypto] Decryption failed:', error);
        // If decryption fails, return empty string (safe default)
        return '';
    }
}

/**
 * Check if a string is already encrypted
 * @param value The string to check
 * @returns true if it appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
    if (!value) return false;
    const parts = value.split(':');
    // Must have 3 parts with correct hex lengths
    return parts.length === 3 &&
        parts[0].length === IV_LENGTH * 2 &&
        parts[1].length === AUTH_TAG_LENGTH * 2;
}
