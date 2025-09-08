import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import bcrypt from 'bcrypt'

let ensured = false
export async function ensureResetTable(): Promise<void> {
	if (ensured) return
	try {
		await prisma.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS ResetTokens (
				id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
				createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
				expiresAt DATETIME NOT NULL,
				usedAt DATETIME,
				email TEXT,
				userId TEXT,
				tokenHash TEXT NOT NULL
			);
		`)
	} catch {}
	ensured = true
}

export function generateToken(): string {
	return crypto.randomBytes(32).toString('hex')
}

function sha256(input: string): string {
	return crypto.createHash('sha256').update(input).digest('hex')
}

export async function createResetTokenForEmail(email: string, ttlMinutes = 30): Promise<{ token: string; resetId: string } | null> {
	await ensureResetTable()
	const user = await prisma.user.findUnique({ where: { email } })
	if (!user) return null
	const token = generateToken()
	const tokenHash = sha256(token)
	const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
	await prisma.$executeRawUnsafe(
		`INSERT INTO ResetTokens (email, userId, tokenHash, expiresAt) VALUES (?,?,?,?)`,
		email,
		user.id,
		tokenHash,
		expiresAt.toISOString(),
	)
	const row: any = await prisma.$queryRawUnsafe(`SELECT id FROM ResetTokens WHERE tokenHash = ? ORDER BY createdAt DESC LIMIT 1`, tokenHash)
	const resetId = Array.isArray(row) ? row?.[0]?.id : (row as any)?.id
	return { token, resetId }
}

export async function verifyResetToken(token: string): Promise<{ userId: string; email: string } | null> {
	await ensureResetTable()
	const tokenHash = sha256(token)
	const rows = await prisma.$queryRawUnsafe<any[]>(
		`SELECT userId, email, expiresAt, usedAt FROM ResetTokens WHERE tokenHash = ? ORDER BY createdAt DESC LIMIT 1`,
		tokenHash,
	)
	const row = rows?.[0]
	if (!row) return null
	if (row.usedAt) return null
	if (new Date(row.expiresAt).getTime() < Date.now()) return null
	return { userId: row.userId, email: row.email }
}

export async function consumeResetTokenAndSetPassword(token: string, newPassword: string): Promise<boolean> {
	await ensureResetTable()
	const tokenHash = sha256(token)
	const verify = await verifyResetToken(token)
	if (!verify) return false
	const passwordHash = await bcrypt.hash(newPassword, 10)
	await prisma.user.update({ where: { id: verify.userId }, data: { passwordHash } })
	await prisma.$executeRawUnsafe(`UPDATE ResetTokens SET usedAt = CURRENT_TIMESTAMP WHERE tokenHash = ?`, tokenHash)
	return true
}
