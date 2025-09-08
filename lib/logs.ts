import { prisma } from '@/lib/prisma'

let logsTableEnsured = false

export async function ensureLogsTable(): Promise<void> {
    if (logsTableEnsured) return
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS Logs (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                level TEXT,
                event TEXT,
                userId TEXT,
                chatId TEXT,
                model TEXT,
                message TEXT
            );
        `)
        logsTableEnsured = true
    } catch {
        logsTableEnsured = true
    }
}

export async function recordLog(entry: {
    level: 'INFO' | 'WARN' | 'ERROR'
    event: string
    userId?: string | null
    chatId?: string | null
    model?: string | null
    message?: string | null
}): Promise<void> {
    try {
        await ensureLogsTable()
        await prisma.$executeRawUnsafe(
            `INSERT INTO Logs (level, event, userId, chatId, model, message) VALUES (?, ?, ?, ?, ?, ?)`,
            entry.level,
            entry.event,
            entry.userId ?? null,
            entry.chatId ?? null,
            entry.model ?? null,
            entry.message ?? null,
        )
    } catch {
        // do not throw from logging
    }
}


