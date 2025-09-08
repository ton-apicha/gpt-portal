"use client"
import { signOut } from 'next-auth/react'
import { useState } from 'react'

export default function UserMenuClient(){
	const [open, setOpen] = useState(false)
	async function doLogout(){
		try { await fetch('/api/admin/logs', { method: 'POST', body: JSON.stringify({ level: 'INFO', event: 'LOGOUT' }) }) } catch {}
		await signOut({ callbackUrl: '/login' })
	}
	return (
		<div className="relative">
			<button onClick={()=> setOpen(v=>!v)} className="rounded border border-white/10 px-3 py-1 text-xs hover:bg-white/10">Account ▾</button>
			{open && (
				<div className="absolute right-0 mt-1 w-40 rounded-md border border-white/10 bg-gray-900 p-1 text-xs shadow-lg">
					<a href="/profile" className="block rounded px-2 py-1 hover:bg-white/10">Profile</a>
					<a href="/sessions" className="mt-1 block rounded px-2 py-1 hover:bg-white/10">Sessions</a>
					<button onClick={doLogout} className="mt-1 block w-full rounded px-2 py-1 text-left hover:bg-white/10">Logout</button>
				</div>
			)}
		</div>
	)
}
