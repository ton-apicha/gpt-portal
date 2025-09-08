import { ReactNode } from 'react'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import SidebarClient from './sidebarClient'
import Link from 'next/link'
import SearchClient from './searchClient'
import ShortcutsClient from './shortcutsClient'
import UserMenuClient from '@/app/components/UserMenuClient'

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
		<div className="flex h-screen bg-gray-900 text-white overflow-hidden">
			<ShortcutsClient />
			<aside className="w-72 shrink-0 border-r border-gray-800 bg-gray-950 hidden md:flex md:flex-col">
				<SidebarClient initialChats={chats} />
			</aside>
			<div className="flex-1 min-w-0 flex flex-col overflow-hidden">
				<div className="border-b border-gray-800 px-4 py-2 flex items-center gap-2">
					<div className="flex-1"><SearchClient /></div>
					<Link href="/status" className="text-xs text-white/60 hover:text-white/90">Status</Link>
					<Link href="/admin" className="text-xs text-white/60 hover:text-white/90">Admin</Link>
					<UserMenuClient />
				</div>
				<main className="flex-1 min-w-0 overflow-hidden">{children}</main>
			</div>
		</div>
	)
}


