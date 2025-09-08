"use client"
import { useEffect, useState } from 'react'

export default function SessionsPage(){
	const [items, setItems] = useState<any[]>([])
	const [loading, setLoading] = useState(true)

	async function load(){
		setLoading(true)
		try{
			const res = await fetch('/api/sessions', { cache: 'no-store' })
			const data = await res.json()
			setItems(data.items || [])
		} finally {
			setLoading(false)
		}
	}

	useEffect(()=>{ load() }, [])

	async function revoke(id: string){
		await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
		await load()
	}

	return (
		<div style={{ maxWidth: 640, margin: '60px auto' }}>
			<h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Sessions</h1>
			{loading ? (
				<div>กำลังโหลด...</div>
			) : (
				<table style={{ width: '100%', fontSize: 13 }}>
					<thead>
						<tr>
							<th align="left">Created</th>
							<th align="left">Last seen</th>
							<th align="left">IP</th>
							<th align="left">Agent</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{items.map((s)=> (
							<tr key={s.id}>
								<td>{s.createdAt || '-'}</td>
								<td>{s.lastSeenAt || '-'}</td>
								<td>{s.ip || '-'}</td>
								<td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.userAgent || '-'}</td>
								<td>
									{!s.revokedAt ? (
										<button onClick={()=> revoke(s.id)}>ยกเลิก</button>
									) : (
										<span>ถูกยกเลิกแล้ว</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	)
}
