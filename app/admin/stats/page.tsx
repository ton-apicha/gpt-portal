import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import TrendChart from '@/components/TrendChart'

export default async function AdminStatsPage() {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') return <div className="p-6 text-white">Forbidden</div>
    const [users, chats, messages, messagesLast24h] = await Promise.all([
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
    return (
        <div className="p-6 text-white space-y-4">
            <h1 className="text-lg font-semibold">Admin • Stats</h1>
            <div className="flex gap-2">
                <a href="/api/admin/stats/export" className="rounded border border-white/10 px-3 py-1 text-sm text-white/80 hover:bg-white/10">Export CSV</a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">Users</div><div className="text-2xl">{users}</div></div>
                <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">Chats</div><div className="text-2xl">{chats}</div></div>
                <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">Messages total</div><div className="text-2xl">{messages}</div></div>
                <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">Messages (24h)</div><div className="text-2xl">{messagesLast24h}</div></div>
            </div>
            {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">Chat calls</div><div className="text-2xl">{metrics.total}</div></div>
                    <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">OK / ERROR / TIMEOUT</div><div className="text-lg">{metrics.ok} / {metrics.error} / {metrics.timeout}</div></div>
                    <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">Tokens (sum)</div><div className="text-2xl">{metrics.tokens}</div></div>
                    <div className="rounded border border-white/10 p-4 md:col-span-3"><div className="text-white/60 text-xs">Avg latency (ms)</div><div className="text-2xl">{metrics.avgLatency}</div></div>
                </div>
            )}

            {/* Trends (14 days) with lightweight-charts */}
            <TrendChart />
        </div>
    )
}


