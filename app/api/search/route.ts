import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrBypass } from '@/lib/session'

export const runtime = 'nodejs'

async function ensureFtsReady() {
    // Create FTS table and triggers if they do not exist
    const [{ exists: tableExists }] = await prisma.$queryRawUnsafe<any[]>(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='message_fts') as exists"
    )
    if (!tableExists) {
        // Virtual table create (no IF NOT EXISTS support reliably) -> guarded by check above
        await prisma.$executeRawUnsafe(
            "CREATE VIRTUAL TABLE message_fts USING fts5(content, messageId UNINDEXED, chatId UNINDEXED, tokenize='unicode61')"
        )
    }
    const [{ exists: trigIns }] = await prisma.$queryRawUnsafe<any[]>(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='message_fts_ai') as exists"
    )
    if (!trigIns) {
        await prisma.$executeRawUnsafe(
            "CREATE TRIGGER message_fts_ai AFTER INSERT ON Message BEGIN INSERT INTO message_fts(rowid, content, messageId, chatId) VALUES (new.id, new.content, new.id, new.chatId); END;"
        )
    }
    const [{ exists: trigDel }] = await prisma.$queryRawUnsafe<any[]>(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='message_fts_ad') as exists"
    )
    if (!trigDel) {
        await prisma.$executeRawUnsafe(
            "CREATE TRIGGER message_fts_ad AFTER DELETE ON Message BEGIN DELETE FROM message_fts WHERE messageId=old.id; END;"
        )
    }
    const [{ exists: trigUpd }] = await prisma.$queryRawUnsafe<any[]>(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='message_fts_au') as exists"
    )
    if (!trigUpd) {
        await prisma.$executeRawUnsafe(
            "CREATE TRIGGER message_fts_au AFTER UPDATE OF content ON Message BEGIN UPDATE message_fts SET content=new.content WHERE messageId=old.id; END;"
        )
    }
}

export async function GET(req: NextRequest) {
    const session = await getSessionOrBypass()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim() || ''
    const chatId = req.nextUrl.searchParams.get('chatId') || null
    if (!q) return NextResponse.json({ results: [] })

    try {
        await ensureFtsReady()
        // Run FTS search limited to current user's chats
        let rows: any[] = []
        if (chatId) {
            rows = await prisma.$queryRawUnsafe<any[]>(
                "SELECT messageId, chatId, snippet(message_fts, 0, '[[[', ']]]', '…', 10) as snippet FROM message_fts WHERE message_fts MATCH ? AND chatId = ? AND chatId IN (SELECT id FROM Chat WHERE userId = ?) LIMIT 20",
                q,
                chatId,
                session.user.id
            )
        } else {
            rows = await prisma.$queryRawUnsafe<any[]>(
                "SELECT messageId, chatId, snippet(message_fts, 0, '[[[', ']]]', '…', 10) as snippet FROM message_fts WHERE message_fts MATCH ? AND chatId IN (SELECT id FROM Chat WHERE userId = ?) LIMIT 20",
                q,
                session.user.id
            )
        }
        return NextResponse.json({ results: rows })
    } catch (e) {
        console.warn('FTS search fallback:', e)
        return NextResponse.json({ results: [] })
    }
}


