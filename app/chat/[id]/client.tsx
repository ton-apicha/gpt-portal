"use client"
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const Markdown = dynamic(() => import('@/components/Markdown'), { ssr: false })

type Message = { id?: string; role: 'user' | 'assistant'; content: string }

export default function ChatClient({ chatId, chatTitle, initialMessages }: { chatId: string; chatTitle: string; initialMessages: Message[] }) {
	const [messages, setMessages] = useState<Message[]>(initialMessages)
	const [input, setInput] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [attachments, setAttachments] = useState<string[]>([])
	const abortRef = useRef<AbortController | null>(null)
	const bottomRef = useRef<HTMLDivElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const router = useRouter()

	useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

	async function send() {
		if ((input.trim().length === 0 && attachments.length === 0) || loading) return
		setLoading(true)
		setError(null)
		const contentParts: string[] = []
		if (input.trim().length > 0) contentParts.push(input.trim())
		if (attachments.length > 0) contentParts.push(attachments.map(u=>`![image](${u})`).join('\n'))
		const finalContent = contentParts.join('\n\n')
		const userMsg = { role: 'user' as const, content: finalContent }
		setMessages((p) => [...p, userMsg])
		setInput('')
		setAttachments([])
		abortRef.current = new AbortController()
		try {
			const res = await fetch(`/api/chats/${chatId}/messages?timeoutMs=30000`, {
				method: 'POST',
				body: JSON.stringify({ content: userMsg.content }),
				signal: abortRef.current.signal,
			})
			if (!res.ok || !res.body) throw new Error(`Failed: ${res.status}`)
			const reader = res.body.getReader()
			const dec = new TextDecoder()
			let reply = ''
			setMessages((p) => [...p, { role: 'assistant', content: '' }])
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				reply += dec.decode(value, { stream: true })
				setMessages((p) => {
					const n = [...p]
					n[n.length - 1] = { role: 'assistant', content: reply }
					return n
				})
			}
			// notify sidebar to refresh titles (auto-title)
			try { window.dispatchEvent(new Event('chats:refresh')) } catch {}
		} catch (e: any) {
			if (e.name === 'AbortError') return
			setError(e.message || 'เกิดข้อผิดพลาด')
		} finally {
			setLoading(false)
			abortRef.current = null
		}
	}

	function stop() {
		abortRef.current?.abort('user-cancel')
		setLoading(false)
		abortRef.current = null
	}

	return (
		<div className="flex flex-col h-full">
			<header className="sticky top-0 z-10 border-b border-white/10 bg-gray-900/80 backdrop-blur">
				<div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
					<div className="truncate text-sm text-white/60">
						<button
							className="rounded border border-white/10 px-3 py-1 text-xs hover:bg-white/10"
							onClick={async()=>{
								const res = await fetch('/api/chats', { method: 'POST', body: JSON.stringify({}) })
								if (!res.ok) return
								const chat = await res.json()
								try { window.dispatchEvent(new Event('chats:refresh')) } catch {}
								router.push(`/chat/${chat.id}`)
							}}
						>
							New Chat
						</button>
					</div>
					<h1 className="truncate text-sm font-semibold text-white/80">{chatTitle}</h1>
					<div className="flex items-center gap-2">
						<button onClick={async()=>{
							const t = prompt('ตั้งชื่อแชทใหม่:', chatTitle)?.trim(); if (!t) return;
							await fetch(`/api/chats/${chatId}`, { method: 'PATCH', body: JSON.stringify({ title: t }) });
							try { window.dispatchEvent(new Event('chats:refresh')) } catch {}
						}} className="rounded border border-white/10 px-3 py-1 text-xs hover:bg-white/10">Rename</button>
						<button onClick={async()=>{
							if(!confirm('ลบแชทนี้?')) return;
							await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
							location.href = '/chat'
						}} className="rounded border border-white/10 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10">Delete</button>
						<button onClick={async()=>{
							const all = messages.map(m=> `${m.role === 'user' ? 'คุณ' : 'ผู้ช่วย'}: ${m.content}`).join('\n\n')
							try { await navigator.clipboard.writeText(all) } catch {}
						}} className="rounded border border-white/10 px-3 py-1 text-xs hover:bg-white/10">คัดลอกทั้งหมด</button>
					</div>
				</div>
			</header>
			<main className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-3xl p-4 space-y-3">
				{messages.map((m, i) => (
					<div key={i} className={`group relative flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
						<div className={`relative max-w-2xl px-4 py-3 rounded-2xl ${m.role === 'user' ? 'bg-blue-600' : 'bg-gray-800 border border-white/10'}`}>
							<span className="font-semibold mr-1">{m.role === 'user' ? 'คุณ' : 'ผู้ช่วย'}:</span>
							{m.role === 'assistant' ? (
								<div className="prose prose-invert max-w-none">
									<Markdown>{m.content}</Markdown>
								</div>
							) : (
								<span>{m.content}</span>
							)}
							{m.role === 'assistant' && m.content && (
								<button
									className="absolute -top-3 right-2 rounded border border-white/10 bg-black/60 px-2 py-0.5 text-[11px] text-white opacity-0 group-hover:opacity-100 hover:bg-black/80"
									data-testid="copy-reply"
									onClick={async ()=>{ try { await navigator.clipboard.writeText(m.content) } catch {} }}
								>
									คัดลอกคำตอบ
								</button>
							)}
						</div>
					</div>
				))}
				{loading && (
					<div className="flex justify-start"><div className="max-w-xl px-4 py-2 rounded-lg bg-gray-700">กำลังสร้างคำตอบ...</div></div>
				)}
				{error && (
					<div className="flex justify-center"><div className="max-w-xl px-4 py-2 rounded-lg bg-red-700">{error}</div></div>
				)}
				<div ref={bottomRef} />
				</div>
			</main>
			<footer className="sticky bottom-0 z-10 border-t border-white/10 bg-gray-900/80 backdrop-blur">
				<div className="mx-auto max-w-3xl px-4 py-3">
					<div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-gray-800 p-2 shadow-xl">
						<button
							className="rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10"
							title="แนบรูปภาพ"
							onClick={() => fileInputRef.current?.click()}
						>
							＋
						</button>
						<input
							type="file"
							accept="image/png,image/jpeg"
							multiple
							className="hidden"
							ref={fileInputRef}
							onChange={async (e) => {
								const files = Array.from(e.target.files || [])
								for (const f of files) {
									if (!['image/png','image/jpeg'].includes(f.type)) continue
									if (f.size > 8 * 1024 * 1024) continue
									const fd = new FormData()
									fd.append('file', f)
									try {
										const res = await fetch('/api/uploads/image', { method: 'POST', body: fd })
										if (res.ok) {
											const json = await res.json()
											setAttachments((p) => [...p, json.url])
										}
									} catch {}
								}
								// reset input so selecting same file again triggers change
								if (e.target) (e.target as HTMLInputElement).value = ''
							}}
						/>
						<textarea
							className="flex-1 max-h-40 min-h-[44px] resize-y rounded-lg bg-transparent px-2 py-2 outline-none placeholder:text-white/40"
							placeholder="พิมพ์ข้อความ..."
							rows={1}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
							disabled={loading}
						/>
						{loading ? (
							<button onClick={stop} className="rounded-lg bg-red-600 px-4 py-2 text-sm disabled:opacity-50">หยุด</button>
						) : (
							<button onClick={send} className="rounded-lg bg-blue-600 px-4 py-2 text-sm disabled:opacity-50" disabled={input.trim().length === 0 && attachments.length === 0}>ส่ง</button>
						)}
					</div>
					{attachments.length > 0 && (
						<div className="mt-2 flex flex-wrap gap-2">
							{attachments.map((u, idx) => (
								<div key={idx} className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/10">
									<img src={u} alt="แนบรูป" className="h-full w-full object-cover" />
									<button
										className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/70 text-white text-xs"
										onClick={() => setAttachments((p) => p.filter((_, i) => i !== idx))}
									>
										×
									</button>
								</div>
							))}
						</div>
					)}
					<p className="mt-2 text-center text-xs text-white/40">กด Enter เพื่อส่ง • Shift+Enter เพื่อขึ้นบรรทัดใหม่</p>
				</div>
			</footer>
		</div>
	)
}


