import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrBypass } from '@/lib/session'
import bcrypt from 'bcrypt'

export async function POST(req: NextRequest) {
    const session = await getSessionOrBypass()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { current, next } = await req.json()
    if (typeof current !== 'string' || typeof next !== 'string' || next.length < 8) {
        return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 })
    const ok = await bcrypt.compare(current, user.passwordHash)
    if (!ok) return NextResponse.json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }, { status: 400 })
    const hash = await bcrypt.hash(next, 10)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } })
    return NextResponse.json({ success: true })
}


