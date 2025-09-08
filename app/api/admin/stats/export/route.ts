import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrBypass } from '@/lib/session'

export async function GET() {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    let rows: any[] = []
    try {
        rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT datetime(createdAt) as createdAt, userId, chatId, model, status, tokenCount, latencyMs FROM Metrics ORDER BY createdAt DESC LIMIT 1000`
        )
    } catch {}
    const header = ['createdAt', 'userId', 'chatId', 'model', 'status', 'tokenCount', 'latencyMs']
    const lines = [header.join(',')]
    for (const r of rows) {
        lines.push([
            r.createdAt ?? '',
            r.userId ?? '',
            r.chatId ?? '',
            r.model ?? '',
            r.status ?? '',
            String(r.tokenCount ?? 0),
            String(r.latencyMs ?? 0),
        ].map((v) => String(v).replace(/"/g, '""')).map((v) => /,|\n|"/.test(v) ? `"${v}"` : v).join(','))
    }
    const csv = lines.join('\n')
    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="metrics.csv"`,
        },
    })
}


