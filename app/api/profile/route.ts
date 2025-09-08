import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET(){
	const session = await getServerSession(authOptions)
	if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
	const user = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { id: true, email: true, name: true, role: true } })
	return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest){
	const session = await getServerSession(authOptions)
	if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
	const schema = z.object({ name: z.string().min(1).max(100).optional(), password: z.string().min(6).optional() })
	const body = await req.json().catch(()=>({}))
	const parsed = schema.safeParse(body)
	if (!parsed.success) return NextResponse.json({ error: 'bad-request' }, { status: 400 })
	const { name, password } = parsed.data
	const data: any = {}
	if (typeof name === 'string') data.name = name
	if (typeof password === 'string'){
		const bcrypt = (await import('bcrypt')).default
		data.passwordHash = await bcrypt.hash(password, 10)
	}
	await prisma.user.update({ where: { id: (session.user as any).id }, data })
	return NextResponse.json({ ok: true })
}


