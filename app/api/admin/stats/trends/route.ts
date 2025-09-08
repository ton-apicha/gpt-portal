import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrBypass } from '@/lib/session'

type TrendPoint = {
    day: string
    total: number
    ok: number
    error: number
    timeout: number
    tokens: number
    avgLatency: number
}

export async function GET() {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const url = new URL((globalThis as any).request?.url || 'http://local')
    const d = Number(url.searchParams?.get?.('days') || 14)
    const days = Math.max(7, Math.min(isNaN(d) ? 14 : d, 30))
    const today = new Date()
    const labels: string[] = []
    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        labels.push(d.toISOString().slice(0, 10))
    }
    let rows: any[] = []
    try {
        rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT strftime('%Y-%m-%d', createdAt) as day,
                COUNT(*) as total,
                SUM(CASE WHEN status='OK' THEN 1 ELSE 0 END) as ok,
                SUM(CASE WHEN status='ERROR' THEN 1 ELSE 0 END) as error,
                SUM(CASE WHEN status='TIMEOUT' THEN 1 ELSE 0 END) as timeout,
                COALESCE(SUM(tokenCount),0) as tokens,
                COALESCE(AVG(latencyMs),0) as avgLatency
            FROM Metrics
            WHERE createdAt >= datetime('now', '-${days - 1} days')
            GROUP BY day
            ORDER BY day ASC`
        )
    } catch {}
    const map = new Map<string, any>()
    for (const r of rows || []) map.set(r.day, r)
    const data: TrendPoint[] = labels.map((day) => {
        const r = map.get(day)
        return {
            day,
            total: Number(r?.total || 0),
            ok: Number(r?.ok || 0),
            error: Number(r?.error || 0),
            timeout: Number(r?.timeout || 0),
            tokens: Number(r?.tokens || 0),
            avgLatency: Math.round(Number(r?.avgLatency || 0)),
        }
    })
    return NextResponse.json({ days: labels.length, data })
}


