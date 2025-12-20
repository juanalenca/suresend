import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'

export async function authRoutes(app: FastifyInstance) {
    // POST /auth/login - Autenticação de usuário
    app.post('/login', async (request, reply) => {
        try {
            const bodySchema = z.object({
                email: z.string().email(),
                password: z.string(),
            })

            const { email, password } = bodySchema.parse(request.body)

            // 1. Verificar se o usuário existe
            const user = await prisma.user.findUnique({
                where: { email }
            })

            // 2. Se usuário não existe, retornar erro 401
            if (!user) {
                return reply.status(401).send({ message: 'Invalid credentials' })
            }

            // 3. Comparar senha (agora sabemos que user não é null)
            const isPasswordValid = await bcrypt.compare(password, user.password)

            if (!isPasswordValid) {
                return reply.status(401).send({ message: 'Invalid credentials' })
            }

            // 4. Gerar Token JWT
            const token = jwt.sign(
                { sub: user.id, email: user.email },
                'SUPER_SECRET_JWT_KEY',
                { expiresIn: '7d' }
            )

            return {
                token,
                user: {
                    name: user.name,
                    email: user.email
                }
            }
        } catch (error) {
            app.log.error(error)
            return reply.status(500).send({
                message: 'Internal server error during login',
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    })
}
