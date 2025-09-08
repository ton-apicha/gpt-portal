import { prisma } from '@/lib/prisma'

let ensured = false
export async function ensureUserDisabledColumn(): Promise<void> {
	if (ensured) return
	try {
		// check pragma for disabled column
		const rows = await prisma.$queryRawUnsafe<any[]>(`PRAGMA table_info('User')`)
		const has = Array.isArray(rows) && rows.some((r) => String(r.name).toLowerCase() === 'disabled')
		if (!has) {
			await prisma.$executeRawUnsafe(`ALTER TABLE User ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0`)
		}
	} catch {}
	ensured = true
}
