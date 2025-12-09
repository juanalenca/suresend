import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Transparent 1x1 GIF
const TRANSPARENT_GIF_BUFFER = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

export async function trackingRoutes(app: FastifyInstance) {
    app.get<{ Params: { id: string } }>('/track/:id/open', async (request, reply) => {
        const { id } = request.params;

        try {
            // Find the log
            const log = await prisma.emailLog.findUnique({
                where: { id },
                include: { campaign: true } // verify campaign exists
            });

            if (log && !log.openedAt) {
                // Update log
                await prisma.emailLog.update({
                    where: { id },
                    data: {
                        status: 'OPENED',
                        openedAt: new Date()
                    }
                });

                // Increment campaign open count
                await prisma.campaign.update({
                    where: { id: log.campaignId },
                    data: {
                        openCount: { increment: 1 }
                    }
                });

                console.log(`[Tracking] Email viewed: ${id}`);
            }

        } catch (error) {
            console.error('[Tracking] Error processing open:', error);
        }

        // Always return the image so the user doesn't see a broken image
        reply.header('Content-Type', 'image/gif');
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        return reply.send(TRANSPARENT_GIF_BUFFER);
    });
}
