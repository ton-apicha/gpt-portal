import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrBypass } from '@/lib/session'

export async function GET() {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const [users, chats, messages, last24h] = await Promise.all([
        prisma.user.count(),
        prisma.chat.count(),
        prisma.message.count(),
        prisma.message.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ])
    let metrics: any = null
    try {
        const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*) as total,
            SUM(CASE WHEN status='OK' THEN 1 ELSE 0 END) as ok,
            SUM(CASE WHEN status='ERROR' THEN 1 ELSE 0 END) as error,
            SUM(CASE WHEN status='TIMEOUT' THEN 1 ELSE 0 END) as timeout,
            COALESCE(SUM(tokenCount),0) as tokens,
            COALESCE(AVG(latencyMs),0) as avgLatency
        FROM Metrics`)
        const r = rows?.[0]
        metrics = {
            total: Number(r?.total || 0),
            ok: Number(r?.ok || 0),
            error: Number(r?.error || 0),
            timeout: Number(r?.timeout || 0),
            tokens: Number(r?.tokens || 0),
            avgLatency: Math.round(Number(r?.avgLatency || 0)),
        }
    } catch {}
    return NextResponse.json({ users, chats, messages, messagesLast24h: last24h, metrics })
}


