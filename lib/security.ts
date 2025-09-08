import { prisma } from '@/lib/prisma'

export type AttemptKind = 'LOGIN' | 'REGISTER' | 'RESET'

let ensured = false
export async function ensureLoginAttemptTable(): Promise<void> {
	if (ensured) return
	try {
		await prisma.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS LoginAttempts (
				id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				kind TEXT, -- 'LOGIN' | 'REGISTER' | 'RESET'
				email TEXT,
				success INTEGER
			);
		`)
	} catch {}
	ensured = true
}

export async function recordAttempt(kind: AttemptKind, email: string, success: boolean): Promise<void> {
	try {
		await ensureLoginAttemptTable()
		await prisma.$executeRawUnsafe(
			`INSERT INTO LoginAttempts (kind,email,success) VALUES (?,?,?)`,
			kind,
			email || '',
			success ? 1 : 0,
		)
	} catch {}
}

export async function isRateLimited(kind: AttemptKind, email: string, maxInWindow = 5, windowMinutes = 10): Promise<boolean> {
	try {
		await ensureLoginAttemptTable()
		const rows = await prisma.$queryRawUnsafe<any[]>(
			`SELECT COUNT(1) as n FROM LoginAttempts WHERE kind = ? AND email = ? AND createdAt >= datetime('now', ?)`,
			kind,
			email || '',
			`-${windowMinutes} minutes`,
		)
		const n = Number(rows?.[0]?.n || 0)
		return n >= maxInWindow
	} catch {
		return false
	}
}
