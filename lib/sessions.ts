import { prisma } from '@/lib/prisma'

let ensured = false
export async function ensureSessionsTable(): Promise<void> {
	if (ensured) return
	try {
		await prisma.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS Sessions (
				id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
				userId TEXT NOT NULL,
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				lastSeenAt DATETIME,
				userAgent TEXT,
				ip TEXT,
				revokedAt DATETIME
			);
		`)
	} catch {}
	ensured = true
}

export async function createSession(userId: string, userAgent: string | null, ip: string | null): Promise<string> {
	await ensureSessionsTable()
	await prisma.$executeRawUnsafe(
		`INSERT INTO Sessions (userId, userAgent, ip) VALUES (?,?,?)`,
		userId,
		userAgent ?? null,
		ip ?? null,
	)
	const row: any = await prisma.$queryRawUnsafe(`SELECT id FROM Sessions WHERE userId = ? ORDER BY createdAt DESC LIMIT 1`, userId)
	return (Array.isArray(row) ? row?.[0]?.id : (row as any)?.id) as string
}

export async function touchSession(sessionId: string): Promise<void> {
	try { await ensureSessionsTable(); await prisma.$executeRawUnsafe(`UPDATE Sessions SET lastSeenAt = CURRENT_TIMESTAMP WHERE id = ?`, sessionId) } catch {}
}

export async function revokeSession(sessionId: string, userId: string): Promise<void> {
	await ensureSessionsTable()
	await prisma.$executeRawUnsafe(`UPDATE Sessions SET revokedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`, sessionId, userId)
}

export async function listSessions(userId: string): Promise<any[]> {
	await ensureSessionsTable()
	const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id, datetime(createdAt) as createdAt, datetime(lastSeenAt) as lastSeenAt, userAgent, ip, revokedAt FROM Sessions WHERE userId = ? ORDER BY coalesce(lastSeenAt, createdAt) DESC`, userId)
	return rows
}

export async function isRevoked(sessionId: string): Promise<boolean> {
	await ensureSessionsTable()
	const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT revokedAt FROM Sessions WHERE id = ? LIMIT 1`, sessionId)
	const r = rows?.[0]
	return Boolean(r?.revokedAt)
}
