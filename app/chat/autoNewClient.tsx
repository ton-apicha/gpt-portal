'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoNewClient(){
	const router = useRouter()
	const firedRef = useRef(false)

	useEffect(() => {
		if (firedRef.current) return
		firedRef.current = true
		;(async () => {
			try{
				const search = typeof location !== 'undefined' ? (location.search || '') : ''
				const res = await fetch('/api/chats', { method: 'POST', body: JSON.stringify({}) })
				if(!res.ok) return
				const chat = await res.json()
				router.replace(`/chat/${chat.id}${search}`)
			} catch {}
		})()
	}, [router])

	return (
		<div className="flex h-screen items-center justify-center text-white">
			<div className="text-center">
				<div className="text-sm text-white/70">กำลังเริ่มแชทใหม่…</div>
			</div>
		</div>
	)
}
