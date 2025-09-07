import { ReactNode } from 'react'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import SidebarClient from './sidebarClient'

export default async function ChatLayout({ children }: { children: ReactNode }) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) {
		return <div className="p-6 text-white">Unauthorized</div>
	}
	const chats = await prisma.chat.findMany({
		where: { userId: session.user.id as string },
		orderBy: { updatedAt: 'desc' },
		select: { id: true, title: true },
	})

	return (
		<div className="flex h-screen bg-gray-900 text-white">
			<aside className="w-72 shrink-0 border-r border-gray-800 bg-gray-950 hidden md:flex md:flex-col">
				<SidebarClient initialChats={chats} />
			</aside>
			<main className="flex-1 min-w-0">{children}</main>
		</div>
	)
}


