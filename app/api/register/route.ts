import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(req: NextRequest){
	try{
		const { email, password, name } = await req.json()
		if (!email || !password || password.length < 6) return NextResponse.json({ error: 'invalid' }, { status: 400 })
		const existed = await prisma.user.findUnique({ where: { email } })
		if (existed) return NextResponse.json({ error: 'exists' }, { status: 409 })
		const passwordHash = await bcrypt.hash(password, 10)
		await prisma.user.create({ data: { email, passwordHash, name } })
		return NextResponse.json({ ok: true })
	}catch(err){
		return NextResponse.json({ error: 'server' }, { status: 500 })
	}
}
