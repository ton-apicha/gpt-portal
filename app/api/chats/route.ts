import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}
	const chats = await prisma.chat.findMany({
		where: { userId: session.user.id as string },
		orderBy: { updatedAt: 'desc' },
		select: { id: true, title: true, _count: { select: { messages: true } } },
	})
	return NextResponse.json(chats)
}

export async function POST(req: NextRequest) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}
	let body: any = {}
	try {
		body = await req.json()
	} catch {}
	const title = typeof body?.title === 'string' && body.title.trim().length > 0 ? body.title.trim() : 'New Chat'
	const chat = await prisma.chat.create({
		data: { title, userId: session.user.id as string },
	})
	return NextResponse.json(chat, { status: 201 })
}


