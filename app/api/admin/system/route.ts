import { NextResponse } from 'next/server'
import { getSessionOrBypass } from '@/lib/session'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const pexec = promisify(execFile)

export async function GET() {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const node = {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        uptimeSec: Math.round(process.uptime()),
    }

    let gpus: Array<{ name: string; memoryTotalMb: number; memoryUsedMb: number; utilizationGpu: number }> | null = null
    try {
        // Query via nvidia-smi if available
        const { stdout } = await pexec('nvidia-smi', [
            '--query-gpu=name,memory.total,memory.used,utilization.gpu',
            '--format=csv,noheader,nounits',
        ], { timeout: 2000 })
        gpus = stdout
            .trim()
            .split('\n')
            .map((line) => line.split(',').map((s) => s.trim()))
            .map(([name, total, used, util]) => ({
                name,
                memoryTotalMb: Number(total || 0),
                memoryUsedMb: Number(used || 0),
                utilizationGpu: Number(util || 0),
            }))
    } catch {}

    return NextResponse.json({ node, gpus })
}


