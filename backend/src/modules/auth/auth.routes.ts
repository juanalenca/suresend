import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'

export async function authRoutes(app: FastifyInstance) {
    app.post('/login', async (request, reply) => {
        const bodySchema = z.object({
            email: z.string().email(),
            password: z.string(),
        })

        const { email, password } = bodySchema.parse(request.body)

        // 1. Try to find user
        let user = await prisma.user.findUnique({
            where: { email }
        })

        // 2. SEED: Removed lazy seed logic. Admin is created in server.ts on startup.

        if (!user) {
            return reply.status(400).send({ message: 'Invalid credentials' })
        }

        // 3. Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return reply.status(400).send({ message: 'Invalid credentials' })
        }

        // 4. Generate Token (Simple secret for demo)
        const token = jwt.sign(
            { sub: user.id, email: user.email },
            'SUPER_SECRET_JWT_KEY',
            { expiresIn: '7d' }
        )

        return { token }
    })
}
