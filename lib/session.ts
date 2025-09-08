import { getServerSession } from 'next-auth'
import { headers, cookies } from 'next/headers'
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
		update: { role: (process.env.E2E_ROLE === 'ADMIN' ? 'ADMIN' : 'USER') as any },
		create: { email: 'e2e@example.com', passwordHash: 'x', role: (process.env.E2E_ROLE === 'ADMIN' ? 'ADMIN' : 'USER') as any },
	})
	let role = user.role
	try {
		const hdrs = headers()
		const roleHeader = hdrs.get('x-e2e-role')
		if (roleHeader) role = (roleHeader.toUpperCase() as any)
	} catch {}
	try {
		const cookieStore = cookies()
		const cookieRole = cookieStore.get('e2e_role')?.value
		if (cookieRole) role = (cookieRole.toUpperCase() as any)
	} catch {}
	return { user: { id: user.id, email: user.email, name: user.name ?? undefined, role } } as any
}


