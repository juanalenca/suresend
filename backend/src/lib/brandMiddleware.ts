import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getUserIdFromJwt } from './jwt';

const prisma = new PrismaClient();

// Extend FastifyRequest to include brandId and userId
declare module 'fastify' {
    interface FastifyRequest {
        brandId: string;
        userId?: string;
    }
}

/**
 * Brand Middleware
 * 
 * This middleware:
 * 1. Verifies JWT and extracts userId
 * 2. Injects brandId into every request based on X-Brand-Id header or default brand
 */
export async function brandMiddleware(request: FastifyRequest, reply: FastifyReply) {
    try {
        // Skip for certain routes that don't need brand context or auth
        const skipRoutes = ['/auth', '/track', '/unsubscribe', '/status'];
        const shouldSkip = skipRoutes.some(route => request.url.startsWith(route));

        if (shouldSkip) {
            return;
        }

        // 1. Extract userId from JWT
        const userId = getUserIdFromJwt(request);

        if (!userId) {
            // No valid JWT - for protected routes, return 401
            // For now, we allow request to continue (route handlers can check)
            // This allows /brands endpoint to work with just the header
            console.warn('[BrandMiddleware] No valid JWT found');
            return;
        }

        // Inject userId into request for downstream use
        request.userId = userId;

        // 2. Verify user exists in database
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            console.warn(`[BrandMiddleware] User not found for JWT userId: ${userId}`);
            return;
        }

        // 3. Try to get brandId from header
        const headerBrandId = request.headers['x-brand-id'] as string | undefined;
        let brandId: string | null = null;

        if (headerBrandId) {
            // Validate that brand belongs to this user
            const brand = await prisma.brand.findFirst({
                where: {
                    id: headerBrandId,
                    userId: user.id
                }
            });

            if (brand) {
                brandId = brand.id;
            } else {
                console.warn(`[BrandMiddleware] Invalid brand ID ${headerBrandId} for user ${user.id}`);
            }
        }

        // 4. If no valid brandId from header, use default brand
        if (!brandId) {
            let defaultBrand = await prisma.brand.findFirst({
                where: {
                    userId: user.id,
                    isDefault: true
                }
            });

            // 5. If no default brand exists, create one
            if (!defaultBrand) {
                defaultBrand = await prisma.brand.create({
                    data: {
                        userId: user.id,
                        name: 'Default Brand',
                        isDefault: true,
                        emailDelay: 1000
                    }
                });
                console.log(`[BrandMiddleware] Created default brand for user ${user.email}`);
            }

            brandId = defaultBrand.id;
        }

        // 6. Inject brandId into request
        request.brandId = brandId;

    } catch (error) {
        console.error('[BrandMiddleware] Error:', error);
        // Don't block the request, just log the error
    }
}

