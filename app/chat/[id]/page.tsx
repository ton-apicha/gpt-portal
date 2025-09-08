import { notFound } from 'next/navigation'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import ChatClient from './client'

export default async function ChatPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ q?: string }> }) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) return notFound()
	const p = await params
	const chat = await prisma.chat.findFirst({ where: { id: p.id, userId: session.user.id as string } })
	if (!chat) return notFound()
	const messages = await prisma.message.findMany({ where: { chatId: chat.id }, orderBy: { createdAt: 'asc' } })
	const sp = await searchParams
	const q = typeof sp?.q === 'string' ? sp.q : ''
	if (q && q.trim()){
		messages.push({ id: 'temp-q', chatId: chat.id, role: 'user', content: q.trim(), createdAt: new Date() } as any)
	}
	return <ChatClient chatId={chat.id} chatTitle={chat.title} initialMessages={messages} />
}


