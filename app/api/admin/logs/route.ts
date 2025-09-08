import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { ensureLogsTable } from '@/lib/logs'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const sp = req.nextUrl.searchParams
    const limit = Math.min(Number(sp.get('limit') || 100), 1000)
    const level = sp.get('level') || ''
    const event = sp.get('event') || ''
    const userId = sp.get('user') || ''
    const chatId = sp.get('chat') || ''
    const before = sp.get('before') || ''

    const whereClauses: Prisma.Sql[] = []
    if (level) whereClauses.push(Prisma.sql`level = ${level}`)
    if (event) whereClauses.push(Prisma.sql`event LIKE ${'%' + event + '%'}`)
    if (userId) whereClauses.push(Prisma.sql`userId = ${userId}`)
    if (chatId) whereClauses.push(Prisma.sql`chatId = ${chatId}`)
    if (before) whereClauses.push(Prisma.sql`createdAt < ${before}`)

    const whereSql = whereClauses.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereClauses, Prisma.sql` AND `)}`
        : Prisma.sql``

    let rows: any[] = []
    try {
        const q = Prisma.sql`
            SELECT datetime(createdAt) as createdAt, level, event, userId, chatId, model, message
            FROM Logs
            ${whereSql}
            ORDER BY createdAt DESC
            LIMIT ${limit}
        `
        rows = await prisma.$queryRaw<any[]>(q)
    } catch {}
    return NextResponse.json({ items: rows })
}

export async function POST(req: NextRequest){
    const session = await getSessionOrBypass()
    if (!session?.user?.id) return NextResponse.json({ ok: true })
    try{
        await ensureLogsTable()
        const body = await req.json().catch(()=>({})) as any
        const { level='INFO', event='CLIENT_EVENT', message=null } = body || {}
        await prisma.$executeRawUnsafe(
            `INSERT INTO Logs (level,event,userId,chatId,model,message) VALUES (?,?,?,?,?,?)`,
            String(level).toUpperCase(),
            String(event).toUpperCase(),
            session.user.id as any,
            null,
            null,
            message ? String(message) : null,
        )
    } catch {}
    return NextResponse.json({ ok: true })
}


