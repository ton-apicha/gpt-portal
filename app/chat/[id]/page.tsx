import { notFound } from 'next/navigation'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import ChatClient from './client'

export default async function ChatPage({ params }: { params: { id: string } }) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) return notFound()
	const chat = await prisma.chat.findFirst({ where: { id: params.id, userId: session.user.id as string } })
	if (!chat) return notFound()
	const messages = await prisma.message.findMany({ where: { chatId: chat.id }, orderBy: { createdAt: 'asc' } })
	return <ChatClient chatId={chat.id} chatTitle={chat.title} initialMessages={messages} />
}


