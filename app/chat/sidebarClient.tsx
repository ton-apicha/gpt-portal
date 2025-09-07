"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

type ChatItem = { id: string; title: string; _count?: { messages: number } }

export default function SidebarClient({ initialChats }: { initialChats: ChatItem[] }) {
	const [chats, setChats] = useState<ChatItem[]>(initialChats)
	const router = useRouter()
	const pathname = usePathname()

	async function refreshList() {
		const res = await fetch('/api/chats')
		if (res.ok) setChats(await res.json())
	}

	async function onNewChat() {
		const res = await fetch('/api/chats', { method: 'POST', body: JSON.stringify({}) })
		if (!res.ok) return
		const chat = await res.json()
		await refreshList()
		router.push(`/chat/${chat.id}`)
	}

	async function onRename(id: string) {
		const title = prompt('ตั้งชื่อแชทใหม่:')?.trim()
		if (!title) return
		await fetch(`/api/chats/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) })
		await refreshList()
	}

	async function onDelete(id: string) {
		if (!confirm('ลบแชทนี้?')) return
		await fetch(`/api/chats/${id}`, { method: 'DELETE' })
		await refreshList()
		if (pathname?.startsWith(`/chat/${id}`)) router.push('/chat')
	}

	useEffect(() => {
		// keep in sync when navigating back
		refreshList()
		const handler = () => { refreshList() }
		window.addEventListener('chats:refresh', handler)
		return () => window.removeEventListener('chats:refresh', handler)
	}, [])

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 border-b border-gray-800">
				<button onClick={onNewChat} className="w-full bg-blue-600 hover:bg-blue-700 rounded px-3 py-2 text-sm">สร้างแชทใหม่</button>
			</div>
			<nav className="flex-1 overflow-y-auto">
				{chats.map((c) => (
					<div key={c.id} className={`group flex items-center justify-between px-3 py-2 border-b border-gray-800 hover:bg-gray-900 ${pathname === `/chat/${c.id}` ? 'bg-gray-900' : ''}`}>
						<div className="flex items-center gap-2 min-w-0">
							<Link href={`/chat/${c.id}`} className={`truncate text-sm ${pathname === `/chat/${c.id}` ? 'text-white' : ''}`}>{c.title}</Link>
							{typeof c._count?.messages === 'number' && (
								<span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 text-[10px] text-white/70">{c._count.messages}</span>
							)}
						</div>
						<div className="opacity-0 group-hover:opacity-100">
							<div className="relative">
								<button className="rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10">⋯</button>
								<div className="absolute right-0 mt-1 hidden min-w-28 rounded-md border border-white/10 bg-gray-900 p-1 text-xs shadow-lg group-hover:block">
									<button onClick={() => onRename(c.id)} className="block w-full rounded px-2 py-1 text-left hover:bg-white/10">Rename</button>
									<button onClick={() => onDelete(c.id)} className="block w-full rounded px-2 py-1 text-left text-red-300 hover:bg-red-500/10">Delete</button>
								</div>
							</div>
						</div>
					</div>
				))}
			</nav>
		</div>
	)
}


