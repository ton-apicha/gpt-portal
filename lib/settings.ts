import { prisma } from '@/lib/prisma'

let ensured = false
export async function ensureSettingsTable(): Promise<void> {
	if (ensured) return
	try {
		await prisma.$executeRawUnsafe(`
			CREATE TABLE IF NOT EXISTS Settings (
				key TEXT PRIMARY KEY,
				value TEXT
			);
		`)
	} catch {}
	ensured = true
}

export type AppSettingKey = 'model' | 'maxTokens' | 'timeoutMs' | 'temperature' | 'top_p'

export async function getSetting(key: AppSettingKey, fallback: string): Promise<string> {
	await ensureSettingsTable()
	const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT value FROM Settings WHERE key = ? LIMIT 1`, key)
	const val = rows?.[0]?.value
	return typeof val === 'string' ? val : fallback
}

export async function setSettings(entries: Partial<Record<AppSettingKey, string>>): Promise<void> {
	await ensureSettingsTable()
	for (const [key, value] of Object.entries(entries)){
		if (typeof value !== 'string') continue
		await prisma.$executeRawUnsafe(`INSERT INTO Settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, key, value)
	}
}

export async function getAllSettings(): Promise<Record<AppSettingKey, string>> {
	await ensureSettingsTable()
	const defaults: Record<AppSettingKey, string> = {
		model: 'llama3.2-vision',
		maxTokens: '512',
		timeoutMs: '90000',
		temperature: '0.7',
		top_p: '0.9',
	}
	const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT key, value FROM Settings`)
	for (const r of rows) {
		if (r?.key && r?.value) (defaults as any)[r.key] = String(r.value)
	}
	return defaults
}
