import { getSessionOrBypass } from '@/lib/session'
import { headers } from 'next/headers'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin • Logs • AI Portal' }

export default async function AdminLogsPage() {
	const session = await getSessionOrBypass()
	if (!session?.user?.id || session.user.role !== 'ADMIN') return <div className="p-6 text-white">Forbidden</div>
	const hdrs = await headers()
	const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || 'localhost:3000'
	const proto = hdrs.get('x-forwarded-proto') || 'http'
	const base = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`

	// Read query from the forwarded URL
	const urlStr = hdrs.get('referer') || `${base}/admin/logs`
	let items: any[] = []
	try{
		const u = new URL(urlStr)
		const sp = u.searchParams
		const qs = new URLSearchParams()
		const level = sp.get('level') || ''
		const event = sp.get('event') || ''
		const user = sp.get('user') || ''
		const chat = sp.get('chat') || ''
		if (level) qs.set('level', level)
		if (event) qs.set('event', event)
		if (user) qs.set('user', user)
		if (chat) qs.set('chat', chat)
		qs.set('limit', '200')
		const res = await fetch(`${base}/api/admin/logs?${qs.toString()}`, { cache: 'no-store' })
		const json = res.ok ? await res.json() : { items: [] }
		items = (json.items as any[]) || []
	}catch{
		const res = await fetch(`${base}/api/admin/logs?limit=200`, { cache: 'no-store' })
		const json = res.ok ? await res.json() : { items: [] }
		items = (json.items as any[]) || []
	}
	return (
		<div className="p-6 text-white space-y-4">
			<h1 className="text-lg font-semibold">Admin • Logs</h1>
			<LogsClient base={base} items={items} />
		</div>
	)
}

function LogsClient({ base, items }: { base: string; items: any[] }){
	return (
		<div className="space-y-3">
			<Filters base={base} />
			<Table items={items} />
		</div>
	)
}

function Filters({ base }: { base: string }){
	return (
		<form action={`${base}/admin/logs`} method="get" className="flex flex-wrap items-end gap-2 text-sm">
			<div>
				<div className="text-white/60 text-xs">Level</div>
				<select name="level" className="rounded border border-white/10 bg-transparent px-2 py-1">
					<option className="bg-gray-900" value="">All</option>
					<option className="bg-gray-900" value="INFO">INFO</option>
					<option className="bg-gray-900" value="WARN">WARN</option>
					<option className="bg-gray-900" value="ERROR">ERROR</option>
				</select>
			</div>
			<div>
				<div className="text-white/60 text-xs">Event</div>
				<input name="event" placeholder="Contains..." className="rounded border border-white/10 bg-transparent px-2 py-1" />
			</div>
			<div>
				<div className="text-white/60 text-xs">User</div>
				<input name="user" placeholder="userId" className="rounded border border-white/10 bg-transparent px-2 py-1" />
			</div>
			<div>
				<div className="text-white/60 text-xs">Chat</div>
				<input name="chat" placeholder="chatId" className="rounded border border-white/10 bg-transparent px-2 py-1" />
			</div>
			<button className="rounded border border-white/10 px-2 py-1 hover:bg-white/10">Apply</button>
			<a
				href={`${base}/api/admin/logs/export`}
				className="rounded border border-white/10 px-2 py-1 hover:bg-white/10"
			>Export CSV</a>
		</form>
	)
}

function Table({ items }: { items: any[] }){
	return (
		<>
			{(!items || items.length === 0) && (
				<div className="rounded border border-white/10 p-6 text-white/60 text-sm">ยังไม่มีล็อกให้แสดง ลองส่งข้อความในหน้าคุยแชท แล้วกลับมารีเฟรชหน้านี้</div>
			)}
			{items && items.length > 0 && (
			<div className="overflow-x-auto rounded border border-white/10">
				<table className="min-w-[900px] text-sm">
					<thead className="text-white/60">
						<tr>
							<th className="text-left p-2">Time</th>
							<th className="text-left p-2">Level</th>
							<th className="text-left p-2">Event</th>
							<th className="text-left p-2">User</th>
							<th className="text-left p-2">Chat</th>
							<th className="text-left p-2">Model</th>
							<th className="text-left p-2">Message</th>
						</tr>
					</thead>
					<tbody>
						{items.map((r, i) => (
							<tr key={i} className="border-t border-white/10">
								<td className="p-2 whitespace-nowrap">{r.createdAt}</td>
								<td className="p-2">{r.level}</td>
								<td className="p-2">{r.event}</td>
								<td className="p-2">{r.userId || '-'}</td>
								<td className="p-2">{r.chatId || '-'}</td>
								<td className="p-2">{r.model || '-'}</td>
								<td className="p-2">{r.message || '-'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			)}
		</>
	)
}


