import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function getSessionOrBypass() {
	const session = await getServerSession(authOptions)
	if (session?.user?.id) return session
	const bypass = process.env.E2E_BYPASS_AUTH ?? (process.env.NODE_ENV !== 'production' ? '1' : '0')
	if (bypass !== '1') return session
	// Ensure a test user exists and return a mock session
	const user = await prisma.user.upsert({
		where: { email: 'e2e@example.com' },
		update: {},
		create: { email: 'e2e@example.com', passwordHash: 'x', role: 'USER' },
	})
	return { user: { id: user.id, email: user.email, name: user.name ?? undefined } } as any
}


