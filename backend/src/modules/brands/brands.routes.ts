import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function brandsRoutes(app: FastifyInstance) {
    // Helper to get current user from auth
    const getCurrentUserId = async (request: any): Promise<string> => {
        // In production, this would come from JWT token
        // For now, get from authorization header or use default user
        const user = await prisma.user.findFirst();
        if (!user) {
            throw new Error('No user found');
        }
        return user.id;
    };

    // GET /brands - List all brands for current user
    app.get('/', async (request, reply) => {
        try {
            const userId = await getCurrentUserId(request);

            const brands = await prisma.brand.findMany({
                where: { userId },
                orderBy: [
                    { isDefault: 'desc' }, // Default brand first
                    { createdAt: 'desc' }
                ],
                include: {
                    _count: {
                        select: {
                            campaigns: true,
                            contacts: true
                        }
                    }
                }
            });

            return { data: brands };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error fetching brands' });
        }
    });

    // GET /brands/:id - Get brand details
    app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
        const { id } = request.params;

        try {
            const userId = await getCurrentUserId(request);

            const brand = await prisma.brand.findFirst({
                where: { id, userId },
                include: {
                    warmupConfig: true,
                    _count: {
                        select: {
                            campaigns: true,
                            contacts: true
                        }
                    }
                }
            });

            if (!brand) {
                return reply.status(404).send({ message: 'Brand not found' });
            }

            // Mask password
            return {
                ...brand,
                smtpPass: brand.smtpPass ? '••••••••' : null
            };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error fetching brand' });
        }
    });

    // POST /brands - Create new brand
    app.post('/', async (request, reply) => {
        const { name, domain, smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, emailDelay } = request.body as {
            name: string;
            domain?: string;
            smtpHost?: string;
            smtpPort?: string;
            smtpUser?: string;
            smtpPass?: string;
            fromEmail?: string;
            emailDelay?: number;
        };

        if (!name || name.trim() === '') {
            return reply.status(400).send({ message: 'Brand name is required' });
        }

        try {
            const userId = await getCurrentUserId(request);

            // Check if this is the first brand (make it default)
            const existingBrands = await prisma.brand.count({ where: { userId } });
            const isDefault = existingBrands === 0;

            const brand = await prisma.brand.create({
                data: {
                    userId,
                    name: name.trim(),
                    domain: domain?.trim() || null,
                    smtpHost: smtpHost || null,
                    smtpPort: smtpPort || null,
                    smtpUser: smtpUser || null,
                    smtpPass: smtpPass || null,
                    fromEmail: fromEmail || null,
                    emailDelay: emailDelay || 1000,
                    isDefault
                }
            });

            console.log(`[Brands] ✅ Created brand: ${brand.name} (default: ${isDefault})`);

            return brand;
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error creating brand' });
        }
    });

    // PUT /brands/:id - Update brand
    app.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
        const { id } = request.params;
        const { name, domain, smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, emailDelay } = request.body as {
            name?: string;
            domain?: string;
            smtpHost?: string;
            smtpPort?: string;
            smtpUser?: string;
            smtpPass?: string;
            fromEmail?: string;
            emailDelay?: number;
        };

        try {
            const userId = await getCurrentUserId(request);

            // Verify brand belongs to user
            const existingBrand = await prisma.brand.findFirst({
                where: { id, userId }
            });

            if (!existingBrand) {
                return reply.status(404).send({ message: 'Brand not found' });
            }

            const updateData: any = {};

            if (name !== undefined) updateData.name = name.trim();
            if (domain !== undefined) updateData.domain = domain?.trim() || null;
            if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
            if (smtpPort !== undefined) updateData.smtpPort = smtpPort;
            if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
            if (fromEmail !== undefined) updateData.fromEmail = fromEmail;
            if (emailDelay !== undefined) updateData.emailDelay = emailDelay;

            // Only update password if provided (non-empty)
            if (smtpPass && smtpPass.trim() !== '' && smtpPass !== '••••••••') {
                updateData.smtpPass = smtpPass;
            }

            const brand = await prisma.brand.update({
                where: { id },
                data: updateData
            });

            console.log(`[Brands] 📝 Updated brand: ${brand.name}`);

            return {
                ...brand,
                smtpPass: brand.smtpPass ? '••••••••' : null
            };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error updating brand' });
        }
    });

    // DELETE /brands/:id - Delete brand
    app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
        const { id } = request.params;

        try {
            const userId = await getCurrentUserId(request);

            const brand = await prisma.brand.findFirst({
                where: { id, userId },
                include: {
                    _count: {
                        select: {
                            campaigns: true,
                            contacts: true
                        }
                    }
                }
            });

            if (!brand) {
                return reply.status(404).send({ message: 'Brand not found' });
            }

            if (brand.isDefault) {
                return reply.status(400).send({ message: 'Cannot delete default brand' });
            }

            if (brand._count.campaigns > 0 || brand._count.contacts > 0) {
                return reply.status(400).send({
                    message: 'Cannot delete brand with existing campaigns or contacts. Delete them first.'
                });
            }

            // Delete warmup config first if exists
            await prisma.warmupConfig.deleteMany({ where: { brandId: id } });

            // Delete brand
            await prisma.brand.delete({ where: { id } });

            console.log(`[Brands] 🗑️ Deleted brand: ${brand.name}`);

            return { message: 'Brand deleted successfully' };
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error deleting brand' });
        }
    });

    // POST /brands/:id/set-default - Set brand as default
    app.post<{ Params: { id: string } }>('/:id/set-default', async (request, reply) => {
        const { id } = request.params;

        try {
            const userId = await getCurrentUserId(request);

            // Verify brand exists
            const brand = await prisma.brand.findFirst({
                where: { id, userId }
            });

            if (!brand) {
                return reply.status(404).send({ message: 'Brand not found' });
            }

            // Remove default from all other brands
            await prisma.brand.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false }
            });

            // Set this brand as default
            const updatedBrand = await prisma.brand.update({
                where: { id },
                data: { isDefault: true }
            });

            console.log(`[Brands] ⭐ Set default brand: ${updatedBrand.name}`);

            return updatedBrand;
        } catch (error) {
            app.log.error(error);
            return reply.status(500).send({ message: 'Error setting default brand' });
        }
    });
}
