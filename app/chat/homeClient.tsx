"use client"
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatHomeClient(){
	const router = useRouter()
	const [input, setInput] = useState('')
	const [loading, setLoading] = useState(false)
	const lastClickRef = useRef<number>(0)

	async function startNewChat(message?: string){
		if (loading) return
		const now = Date.now()
		if (now - lastClickRef.current < 800) return
		lastClickRef.current = now
		setLoading(true)
		try{
			const res = await fetch('/api/chats', { method: 'POST', body: JSON.stringify({}) })
			if(!res.ok) return
			const chat = await res.json()
			const q = message && message.trim().length > 0 ? `?q=${encodeURIComponent(message.trim())}` : ''
			router.push(`/chat/${chat.id}${q}`)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex h-screen flex-col bg-gray-900 text-white">
			<header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
				<button onClick={()=>startNewChat()} disabled={loading} className="rounded border border-white/10 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-50">New Chat</button>
				<div className="text-sm text-white/70">Chat</div>
				<a href="/settings" className="rounded border border-white/10 px-3 py-1 text-sm hover:bg-white/10">Settings</a>
			</header>
			<main className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-3xl px-4 py-16">
					<div className="text-center space-y-3">
						<div className="text-2xl font-semibold">เริ่มคุยกับผู้ช่วยของคุณ</div>
						<div className="text-white/60">ถามอะไรก็ได้ เช่น “สรุปข่าววันนี้” หรือ “ช่วยอธิบายโค้ดนี้”</div>
					</div>
					<div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
						{['สรุปประชุมทีม', 'วางแผนเที่ยวเชียงใหม่ 3 วัน', 'อธิบาย Docker แบบเข้าใจง่าย'].map((ex, i)=>(
							<button key={i} onClick={()=> startNewChat(ex)} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10">
								<div className="text-sm font-medium">{ex}</div>
								<div className="mt-1 text-xs text-white/60">คลิกเพื่อเริ่มการสนทนา</div>
							</button>
						))}
					</div>
				</div>
			</main>
			<footer className="sticky bottom-0 border-t border-white/10 bg-gray-900/80 backdrop-blur">
				<div className="mx-auto max-w-3xl px-4 py-3">
					<form onSubmit={(e)=>{ e.preventDefault(); if(!loading) startNewChat(input) }} className="flex items-end gap-2 rounded-2xl border border-white/10 bg-gray-800 p-2 shadow-xl">
						<textarea
							className="flex-1 max-h-40 min-h-[44px] resize-y rounded-lg bg-transparent px-2 py-2 outline-none placeholder:text-white/40"
							placeholder="พิมพ์ข้อความ..."
							rows={1}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							disabled={loading}
						/>
						<button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm disabled:opacity-50" disabled={loading || input.trim().length===0}>เริ่มคุย</button>
					</form>
					<p className="mt-2 text-center text-xs text-white/40">นี่คือหน้าเริ่มต้นแบบ ChatGPT • เริ่มพิมพ์เพื่อสร้างแชทใหม่</p>
				</div>
			</footer>
		</div>
	)
}
