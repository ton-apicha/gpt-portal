import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const chat = await prisma.chat.findFirst({ where: { id: params.id, userId: session.user.id as string } })
	if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 })
	return NextResponse.json(chat)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const { title } = await req.json()
	if (typeof title !== 'string' || title.trim().length === 0) {
		return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
	}
	const updated = await prisma.chat.update({
		where: { id: params.id },
		data: { title: title.trim() },
	})
	return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	await prisma.chat.delete({ where: { id: params.id } })
	return NextResponse.json({ ok: true })
}


