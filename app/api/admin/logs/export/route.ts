import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const sp = req.nextUrl.searchParams
    const limit = Math.min(Number(sp.get('limit') || 1000), 5000)
    const level = sp.get('level') || ''
    const event = sp.get('event') || ''
    const userId = sp.get('user') || ''
    const chatId = sp.get('chat') || ''

    const whereClauses: Prisma.Sql[] = []
    if (level) whereClauses.push(Prisma.sql`level = ${level}`)
    if (event) whereClauses.push(Prisma.sql`event LIKE ${'%' + event + '%'}`)
    if (userId) whereClauses.push(Prisma.sql`userId = ${userId}`)
    if (chatId) whereClauses.push(Prisma.sql`chatId = ${chatId}`)

    const whereSql = whereClauses.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereClauses, Prisma.sql` AND `)}`
        : Prisma.sql``

    let rows: any[] = []
    try {
        const query = Prisma.sql`
            SELECT datetime(createdAt) as createdAt, level, event, userId, chatId, model, message
            FROM Logs
            ${whereSql}
            ORDER BY createdAt DESC
            LIMIT ${limit}
        `
        rows = await prisma.$queryRaw<any[]>(query)
    } catch {}

    const header = ['createdAt','level','event','userId','chatId','model','message']
    const lines = [header.join(',')]
    for (const r of rows) {
        lines.push([
            r.createdAt ?? '',
            r.level ?? '',
            r.event ?? '',
            r.userId ?? '',
            r.chatId ?? '',
            r.model ?? '',
            r.message ?? '',
        ].map((v) => String(v).replace(/"/g, '""')).map((v) => /,|\n|"/.test(v) ? `"${v}"` : v).join(','))
    }
    const csv = lines.join('\n')
    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="logs.csv"`,
        },
    })
}
