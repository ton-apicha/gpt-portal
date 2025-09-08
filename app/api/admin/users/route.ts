import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrBypass } from '@/lib/session'
import { ensureUserDisabledColumn } from '@/lib/users'
import bcrypt from 'bcrypt'

export async function GET() {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await ensureUserDisabledColumn()
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, role: true, createdAt: true, disabled: true },
    })
    return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
    const session = await getSessionOrBypass()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await ensureUserDisabledColumn()
    const body = await req.json()
    const userId = String(body?.userId || '')
    if (!userId) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    // Update role
    if (typeof body?.role === 'string' && ['ADMIN','USER'].includes(body.role)) {
        const updated = await prisma.user.update({ where: { id: userId }, data: { role: body.role } })
        return NextResponse.json({ id: updated.id, role: updated.role })
    }

    // Toggle disabled
    if (typeof body?.disabled === 'boolean') {
        const updated = await prisma.user.update({ where: { id: userId }, data: { disabled: body.disabled } as any })
        return NextResponse.json({ id: updated.id, disabled: (updated as any).disabled })
    }

    // Reset password (generate temp)
    if (body?.resetPassword === true) {
        const temp = Math.random().toString(36).slice(2, 10)
        const hash = await bcrypt.hash(temp, 10)
        await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })
        return NextResponse.json({ ok: true, temp })
    }

    return NextResponse.json({ error: 'No-op' }, { status: 400 })
}


