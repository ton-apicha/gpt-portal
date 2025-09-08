import { prisma } from '@/lib/prisma'

let metricsTableEnsured = false

export async function ensureMetricsTable(): Promise<void> {
    if (metricsTableEnsured) return
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS Metrics (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                userId TEXT,
                chatId TEXT,
                model TEXT,
                status TEXT,
                tokenCount INTEGER,
                latencyMs INTEGER,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `)
        metricsTableEnsured = true
    } catch {
        // swallow errors, metrics must never break the app
        metricsTableEnsured = true
    }
}

export async function recordChatMetrics(params: {
    userId: string
    chatId: string
    model: string
    status: string
    tokenCount: number
    latencyMs: number
}): Promise<void> {
    try {
        await ensureMetricsTable()
        await prisma.$executeRawUnsafe(
            `INSERT INTO Metrics (userId, chatId, model, status, tokenCount, latencyMs) VALUES (?, ?, ?, ?, ?, ?)`,
            params.userId,
            params.chatId,
            params.model,
            params.status,
            params.tokenCount,
            params.latencyMs,
        )
    } catch {
        // swallow errors
    }
}


