import type { NextAuthOptions, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
	secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret',
	session: { strategy: 'jwt' },
	pages: { signIn: '/login' },
	providers: [
		Credentials({
			name: 'credentials',
			credentials: { email: {}, password: {} },
			authorize: async (credentials) => {
				const schema = z.object({ email: z.string().email(), password: z.string().min(6) })
				const parsed = schema.safeParse(credentials)
				if (!parsed.success) return null
				const { email, password } = parsed.data
				const user = await prisma.user.findUnique({ where: { email } })
				if (!user) return null
				const ok = await bcrypt.compare(password, user.passwordHash)
				if (!ok) return null
				return { id: user.id, email: user.email, name: user.name ?? undefined }
			},
		}),
	],
	callbacks: {
		jwt: async ({ token }): Promise<JWT> => {
			if (token?.email) {
				const db = await prisma.user.findUnique({ where: { email: token.email } })
				if (db) {
					;(token as any).userId = db.id
					;(token as any).role = db.role
				}
			}
			return token
		},
		session: async ({ session, token }): Promise<Session> => {
			if (session.user) {
				;(session as any).user.id = (token as any).userId
				;(session as any).user.role = (token as any).role
			}
			return session
		},
	},
}


