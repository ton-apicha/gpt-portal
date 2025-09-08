import type { NextAuthOptions, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { isRateLimited, recordAttempt } from '@/lib/security'
import { recordLog } from '@/lib/logs'

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
				if (await isRateLimited('LOGIN', email)) {
					try { await recordLog({ level: 'WARN', event: 'LOGIN_RATELIMIT', message: email }) } catch {}
					return null
				}
				const user = await prisma.user.findUnique({ where: { email } })
				if (!user) {
					try { await recordLog({ level: 'WARN', event: 'LOGIN_FAIL', message: email }) } catch {}
					await recordAttempt('LOGIN', email, false);
					return null
				}
				if ((user as any).disabled) {
					try { await recordLog({ level: 'WARN', event: 'LOGIN_DISABLED', userId: user.id, message: email }) } catch {}
					await recordAttempt('LOGIN', email, false);
					return null
				}
				const ok = await bcrypt.compare(password, user.passwordHash)
				if (!ok) {
					try { await recordLog({ level: 'WARN', event: 'LOGIN_FAIL', userId: user.id, message: email }) } catch {}
					await recordAttempt('LOGIN', email, false);
					return null
				}
				await recordAttempt('LOGIN', email, true)
				try { await recordLog({ level: 'INFO', event: 'LOGIN_OK', userId: user.id, message: email }) } catch {}
				return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role }
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


