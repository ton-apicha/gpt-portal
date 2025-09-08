import { getSessionOrBypass } from '@/lib/session'
import { headers } from 'next/headers'

export default async function AdminModelPage() {
	const session = await getSessionOrBypass()
	if (!session?.user?.id || session.user.role !== 'ADMIN') return <div className="p-6 text-white">Forbidden</div>
	const hdrs = headers()
	const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || 'localhost:3000'
	const proto = hdrs.get('x-forwarded-proto') || 'http'
	const base = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`
	const extraHeaders: HeadersInit = {}
	if (process.env.NODE_ENV !== 'production') (extraHeaders as any)['x-test-bypass'] = '1'
	const res = await fetch(`${base}/api/admin/model`, { cache: 'no-store', headers: extraHeaders })
	const data = res.ok ? await res.json() : null
	const items: any[] = data?.data?.models || []
	return (
		<div className="p-6 text-white space-y-4">
			<h1 className="text-lg font-semibold">Admin • Models</h1>
			<form>
				<button formAction={async()=>{
					'use server'
					const hdrs = headers()
					const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || 'localhost:3000'
					const proto = hdrs.get('x-forwarded-proto') || 'http'
					const base = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`
					const extra: HeadersInit = {}
					if (process.env.NODE_ENV !== 'production') (extra as any)['x-test-bypass'] = '1'
					await fetch(`${base}/api/admin/model`, { method: 'POST', headers: extra, body: JSON.stringify({ action: 'pull', model: 'llama3.2-vision' }) })
				}} className="rounded bg-blue-600 px-3 py-1">Pull llama3.2-vision</button>
				<button formAction={async()=>{
					'use server'
					const hdrs = headers()
					const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || 'localhost:3000'
					const proto = hdrs.get('x-forwarded-proto') || 'http'
					const base = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`
					const extra: HeadersInit = {}
					if (process.env.NODE_ENV !== 'production') (extra as any)['x-test-bypass'] = '1'
					await fetch(`${base}/api/admin/model`, { method: 'POST', headers: extra, body: JSON.stringify({ action: 'pull', model: 'gpt-oss:120b' }) })
				}} className="ml-2 rounded bg-blue-600 px-3 py-1">Pull gpt-oss:120b</button>
			</form>
			<div className="rounded border border-white/10">
				<div className="border-b border-white/10 px-3 py-2 text-white/70 text-sm">Installed</div>
				<ul className="divide-y divide-white/10">
					{items.map((m) => (
						<li key={m.name} className="px-3 py-2 text-sm">{m.name}</li>
					))}
				</ul>
			</div>
		</div>
	)
}


