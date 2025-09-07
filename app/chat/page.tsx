import { redirect } from 'next/navigation'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export default async function ChatIndexRedirect() {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) redirect('/login')
	const chat = await prisma.chat.create({ data: { title: 'New Chat', userId: session.user.id as string } })
	redirect(`/chat/${chat.id}`)
}


