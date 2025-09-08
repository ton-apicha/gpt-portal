import { getSessionOrBypass } from '@/lib/session'
import { headers } from 'next/headers'

export default async function AdminSystemPage() {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') return <div className="p-6 text-white">Forbidden</div>
    const hdrs = headers()
    const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || 'localhost:3000'
    const proto = hdrs.get('x-forwarded-proto') || 'http'
    const base = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`
    const res = await fetch(`${base}/api/admin/system`, { cache: 'no-store' })
    const data = res.ok ? await res.json() : null
    const node = data?.node
    const gpus = data?.gpus as Array<any> | null
    return (
        <div className="p-6 text-white space-y-6">
            <h1 className="text-lg font-semibold">Admin • System</h1>
            {node && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">PID</div><div className="text-2xl">{node.pid}</div></div>
                    <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">Node</div><div className="text-2xl">{node.version}</div></div>
                    <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">Memory (MB)</div><div className="text-2xl">{node.memoryMb}</div></div>
                    <div className="rounded border border-white/10 p-4"><div className="text-white/60 text-xs">Uptime (s)</div><div className="text-2xl">{node.uptimeSec}</div></div>
                </div>
            )}
            <div>
                <h2 className="text-base font-semibold mb-2">GPU</h2>
                {!gpus && <div className="text-white/60">nvidia-smi not available</div>}
                {gpus && gpus.length === 0 && <div className="text-white/60">No GPUs detected</div>}
                {gpus && gpus.length > 0 && (
                    <table className="min-w-[640px] text-sm">
                        <thead className="text-white/60">
                            <tr>
                                <th className="text-left p-2">Name</th>
                                <th className="text-left p-2">Memory (used/total MB)</th>
                                <th className="text-left p-2">Utilization (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gpus.map((g, i) => (
                                <tr key={i} className="border-t border-white/10">
                                    <td className="p-2">{g.name}</td>
                                    <td className="p-2">{g.memoryUsedMb} / {g.memoryTotalMb}</td>
                                    <td className="p-2">{g.utilizationGpu}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}


