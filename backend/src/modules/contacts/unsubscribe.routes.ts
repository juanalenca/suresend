import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function unsubscribeRoutes(app: FastifyInstance) {
    app.get('/:token', async (request, reply) => {
        const { token } = request.params as { token: string };

        try {
            // Find contact
            const contact = await prisma.contact.findUnique({
                where: { unsubscribeToken: token }
            });

            if (!contact) {
                return reply.code(404).send({ error: 'Token inválido ou expirado.' });
            }

            // Update status
            await prisma.contact.update({
                where: { id: contact.id },
                data: { status: 'UNSUBSCRIBED' }
            });

            return { message: 'Descadastro realizado com sucesso.' };

        } catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: 'Erro ao processar descadastro.' });
        }
    });
}
