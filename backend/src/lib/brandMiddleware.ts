import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend FastifyRequest to include brandId
declare module 'fastify' {
    interface FastifyRequest {
        brandId: string;
    }
}

/**
 * Brand Middleware
 * 
 * This middleware injects brandId into every request.
 * It checks for X-Brand-Id header, or falls back to default brand.
 */
export async function brandMiddleware(request: FastifyRequest, reply: FastifyReply) {
    try {
        // Skip for certain routes that don't need brand context
        const skipRoutes = ['/auth', '/track', '/unsubscribe', '/status', '/brands'];
        const shouldSkip = skipRoutes.some(route => request.url.startsWith(route));

        if (shouldSkip) {
            return;
        }

        // 1. Try to get brandId from header
        const headerBrandId = request.headers['x-brand-id'] as string | undefined;

        // 2. Get current user (in production, this would come from JWT)
        const user = await prisma.user.findFirst();
        if (!user) {
            // No user, skip brand middleware (auth route will handle)
            return;
        }

        let brandId: string | null = null;

        if (headerBrandId) {
            // Validate that brand belongs to user
            const brand = await prisma.brand.findFirst({
                where: {
                    id: headerBrandId,
                    userId: user.id
                }
            });

            if (brand) {
                brandId = brand.id;
            } else {
                console.warn(`[BrandMiddleware] Invalid brand ID: ${headerBrandId}`);
            }
        }

        // 3. If no valid brandId from header, use default brand
        if (!brandId) {
            let defaultBrand = await prisma.brand.findFirst({
                where: {
                    userId: user.id,
                    isDefault: true
                }
            });

            // 4. If no default brand exists, create one
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

        // 5. Inject brandId into request
        request.brandId = brandId;

    } catch (error) {
        console.error('[BrandMiddleware] Error:', error);
        // Don't block the request, just log the error
    }
}
