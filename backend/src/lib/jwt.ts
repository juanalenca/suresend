import jwt from 'jsonwebtoken';
import { FastifyRequest } from 'fastify';

// JWT Secret - should match auth.routes.ts
// In production, this should come from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_JWT_KEY';

// JWT Payload interface
export interface JwtPayload {
    sub: string;  // userId
    email: string;
    iat?: number;
    exp?: number;
}

// Extend FastifyRequest to include user info
declare module 'fastify' {
    interface FastifyRequest {
        userId?: string;
        userEmail?: string;
    }
}

/**
 * Extract and verify JWT from Authorization header
 * @param request Fastify request with Authorization header
 * @returns Decoded JWT payload or null if invalid/missing
 */
export function verifyJwt(request: FastifyRequest): JwtPayload | null {
    try {
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.replace('Bearer ', '');

        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        return decoded;
    } catch (error) {
        // Token is invalid, expired, or malformed
        return null;
    }
}

/**
 * Get userId from JWT in request
 * @param request Fastify request
 * @returns userId string or null if not authenticated
 */
export function getUserIdFromJwt(request: FastifyRequest): string | null {
    const payload = verifyJwt(request);
    return payload?.sub || null;
}
