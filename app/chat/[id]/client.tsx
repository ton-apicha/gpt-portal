"use client"
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

type Message = { id?: string; role: 'user' | 'assistant'; content: string }

type StreamEvent =
	| { type: 'thinking'; delta: string }
	| { type: 'content'; delta: string }
	| { type: 'done' }
	| { type: 'debug'; line: string }

const Markdown = dynamic(() => import('@/components/Markdown'), { ssr: false })

export default function ChatClient({ chatId, chatTitle, initialMessages }: { chatId: string; chatTitle: string; initialMessages: Message[] }) {
	const [messages, setMessages] = useState<Message[]>(initialMessages || [])
	const [input, setInput] = useState('')
	const [loading, setLoading] = useState(false)
	const bottomRef = useRef<HTMLDivElement>(null)
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
	const [attachments, setAttachments] = useState<string[]>([])
	const fileInputRef = useRef<HTMLInputElement>(null)
	const scrollRef = useRef<HTMLDivElement>(null)
	const [atBottom, setAtBottom] = useState(true)
	const [hasNewBelow, setHasNewBelow] = useState(false)
	const [atTop, setAtTop] = useState(false)
	const [highlightedId, setHighlightedId] = useState<string | null>(null)
	const autoStartedRef = useRef(false)
	const [models, setModels] = useState<string[]>([])
	const [model, setModel] = useState<string>('llama3.2-vision')
	const [thinking, setThinking] = useState<string>('')
	const [showThinking, setShowThinking] = useState<boolean>(true)
	const hasThinkingRef = useRef<boolean>(false)
	const replyBufferRef = useRef<string>('')
	const abortRef = useRef<AbortController | null>(null)
	const [debug, setDebug] = useState<boolean>(() => { try { return localStorage.getItem('chat_debug') === '1' } catch { return false } })
	const [debugLines, setDebugLines] = useState<string[]>([])

	useEffect(() => {
		if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
		else setHasNewBelow(true)
	}, [messages])

	useEffect(() => {
		const el = scrollRef.current
		if (!el) return
		const onScroll = () => {
			const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 80
			const nearTop = el.scrollTop <= 80
			setAtBottom(nearBottom)
			setAtTop(nearTop)
			if (nearBottom) setHasNewBelow(false)
		}
		el.addEventListener('scroll', onScroll)
		onScroll()
		return () => el.removeEventListener('scroll', onScroll)
	}, [])

	useEffect(() => {
		// load models for selector
		;(async () => {
			try {
				const res = await fetch('/api/models')
				const data = await res.json()
				const all = Array.isArray(data?.models) ? data.models : []
				setModels(all)
				if (all.length > 0 && !all.includes(model)) setModel(all[0])
			} catch {}
		})()
	}, [])

	// Wire global chat:send event (from Ctrl/Cmd+Enter shortcut)
	useEffect(() => {
		const onSend = () => { if (!loading) { send() } }
		window.addEventListener('chat:send', onSend as any)
		return () => window.removeEventListener('chat:send', onSend as any)
	}, [loading])

	// Scroll to message if URL has #messageId and highlight briefly
	useEffect(() => {
		function scrollToHash(h?: string){
			try{
				const hash = typeof h === 'string' && h ? h : (typeof location !== 'undefined' ? location.hash : '')
				if (!hash) return
				const id = decodeURIComponent(hash.replace(/^#/, ''))
				if (!id) return
				const el = document.getElementById(id)
				if (!el) return
				el.scrollIntoView({ behavior: 'smooth', block: 'center' })
				setHighlightedId(id)
				setTimeout(() => setHighlightedId((v) => v === id ? null : v), 1600)
			}catch{}
		}
		// initial
		scrollToHash()
		// on hash change
		const onHash = () => scrollToHash()
		window.addEventListener('hashchange', onHash)
		return () => window.removeEventListener('hashchange', onHash)
	}, [messages.length])

	function stop(){
		try { abortRef.current?.abort() } catch {}
		// ถ้ากำลัง thinking ให้พับและปล่อยคำตอบที่บัฟเฟอร์ไว้
		if (hasThinkingRef.current) {
			setShowThinking(false)
			setMessages((p) => {
				const n = [...p]
				const last = n.length - 1
				if (last >= 0 && n[last].role === 'assistant') n[last] = { role: 'assistant', content: replyBufferRef.current }
				else n.push({ role: 'assistant', content: replyBufferRef.current })
				return n
			})
			replyBufferRef.current = ''
			hasThinkingRef.current = false
		}
		setLoading(false)
	}

	async function send() {
		const text = input.trim()
		if ((!text && attachments.length === 0) || loading) return
		setLoading(true)
		const parts: string[] = []
		if (text) parts.push(text)
		if (attachments.length > 0) parts.push(attachments.map(u => `![image](${u})`).join('\n'))
		const content = parts.join('\n\n')
		const userMsg: Message = { role: 'user', content }
		setMessages((p) => [...p, userMsg])
		setInput('')
		setAttachments([])
		setThinking('')
		setShowThinking(true)
		hasThinkingRef.current = false
		replyBufferRef.current = ''
		setDebugLines([])
		const ac = new AbortController(); abortRef.current = ac
		try {
			const qp = new URLSearchParams()
			if (model) qp.set('model', model)
			if (debug) qp.set('debug', '1')
			const res = await fetch(`/api/chats/${chatId}/messages?${qp.toString()}`, { method: 'POST', body: JSON.stringify({ content }), signal: ac.signal })
			if (!res.ok || !res.body) throw new Error(`Failed: ${res.status}`)
			const contentType = (res.headers.get('content-type') || '').toLowerCase()
			const reader = res.body.getReader()
			const dec = new TextDecoder()
			let reply = ''
			setMessages((p) => [...p, { role: 'assistant', content: '' }])
			if (contentType.includes('application/x-ndjson')) {
				let buffer = ''
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					buffer += dec.decode(value)
					const lines = buffer.split('\n')
					buffer = lines.pop() || ''
					for (const line of lines) {
						if (!line.trim()) continue
						let evt: StreamEvent | null = null
						try { evt = JSON.parse(line) as StreamEvent } catch { continue }
						if (evt.type === 'debug') { setDebugLines((p)=> [...p, evt.line]); continue }
						if (evt.type === 'thinking') { hasThinkingRef.current = true; setThinking((p) => p + evt!.delta); continue }
						if (evt.type === 'content') {
							if (hasThinkingRef.current) {
								// transition from thinking → streaming reply immediately
								setShowThinking(false)
								hasThinkingRef.current = false
								reply = replyBufferRef.current + evt.delta
								replyBufferRef.current = ''
								setMessages((p) => { const n = [...p]; n[n.length - 1] = { role: 'assistant', content: reply }; return n })
								continue
							}
							reply += evt.delta
							setMessages((p) => { const n = [...p]; n[n.length - 1] = { role: 'assistant', content: reply }; return n })
							continue
						}
						if (evt.type === 'done') {
							if (hasThinkingRef.current) {
								setShowThinking(false)
								reply = replyBufferRef.current
								setMessages((p) => { const n = [...p]; n[n.length - 1] = { role: 'assistant', content: reply }; return n })
								replyBufferRef.current = ''
								hasThinkingRef.current = false
							}
						}
					}
				}
			} else {
				// Fallback: plain text streaming
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					reply += dec.decode(value, { stream: true })
					setMessages((p) => { const n = [...p]; n[n.length - 1] = { role: 'assistant', content: reply }; return n })
				}
			}
		} catch {
			// swallow minimal errors (includes AbortError)
		} finally {
			abortRef.current = null
			setLoading(false)
		}
	}

	// Auto-start when initial messages contain one pending user question (from q) and no assistant reply
	useEffect(() => {
		if (autoStartedRef.current) return
		if (messages.length > 0 && messages[messages.length - 1].role === 'user'){
			autoStartedRef.current = true
			setInput(messages[messages.length - 1].content)
			// slight delay to ensure UI ready
			setTimeout(() => { send() }, 0)
		}
	}, [])

	return (
		<div className="flex h-full flex-col">
			<header className="sticky top-0 z-10 border-b border-white/10 bg-gray-900/80 backdrop-blur">
				<div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
					<h1 className="truncate text-sm font-semibold text-white/80 flex-1">{chatTitle}</h1>
					{/* Model selector */}
					<div className="flex items-center gap-2">
						<label className="text-xs text-white/60">Model</label>
						<select value={model} onChange={(e)=>setModel(e.target.value)} className="rounded border border-white/10 bg-transparent px-2 py-1 text-xs">
							{models.map(m => <option key={m} value={m} className="bg-gray-900">{m}</option>)}
						</select>
					</div>
					{/* Debug toggle */}
					<label className="ml-2 flex items-center gap-1 text-xs text-white/60">
						<input type="checkbox" checked={debug} onChange={(e)=>{ setDebug(e.target.checked); try{ localStorage.setItem('chat_debug', e.target.checked ? '1' : '0') }catch{} }} />
						Debug
					</label>
				</div>
			</header>
			<main ref={scrollRef} className="relative flex-1 overflow-y-auto">
				<div className="mx-auto max-w-3xl p-4 space-y-3">
					{messages.map((m, i) => (
						<div key={i} id={m.id ? String(m.id) : undefined} className={highlightedId && m.id === highlightedId ? 'ring-2 ring-yellow-400/50 rounded-xl p-1 -m-1' : undefined}>
							<div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
								<div className={`${m.role === 'user' ? 'bg-blue-600' : 'bg-gray-800'} relative max-w-2xl whitespace-pre-wrap break-words rounded-2xl px-4 py-3`}>
									{m.role === 'assistant' ? (
										<div className="prose prose-invert max-w-none"><Markdown>{m.content}</Markdown></div>
									) : (
										<span>{m.content}</span>
									)}
									{m.role === 'assistant' && m.content && (
										<>
											<button
												aria-label="คัดลอกคำตอบ"
												data-testid="copy-reply"
												onClick={async ()=>{ try { await navigator.clipboard.writeText(m.content) } catch {} finally { setCopiedIndex(i); setTimeout(()=>setCopiedIndex((v)=> v===i ? null : v), 1500) } }}
												className={`absolute -top-3 right-2 rounded-full border border-white/10 p-1.5 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition ${copiedIndex===i ? 'bg-emerald-600' : 'bg-black/60 hover:bg-black/80'}`}
											>
												{copiedIndex===i ? (
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
														<path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
													</svg>
												) : (
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
														<rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
														<rect x="2" y="2" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
													</svg>
												)}
											</button>
											{copiedIndex===i && (
												<span data-testid="copied-indicator" className="absolute -top-3 right-10 rounded border border-white/10 bg-black/70 px-2 py-0.5 text-[11px] text-white">คัดลอกแล้ว</span>
											)}
										</>
									)}
								</div>
							</div>
							{/* Insert thinking panel right after the latest user message (before assistant) */}
							{thinking && i === messages.length - 2 && m.role === 'user' && messages[messages.length - 1]?.role === 'assistant' && (
								<div className="mt-3 flex justify-start">
									<div className="rounded-xl border border-white/10 bg-yellow-500/10 p-3 text-xs text-white/80">
										<div className="mb-1 flex items-center justify-between">
											<span>กำลังคิด...</span>
											<button className="text-white/70 hover:text-white" onClick={()=>setShowThinking((v)=>!v)}>{showThinking ? 'พับ' : 'แสดง'}</button>
										</div>
										{showThinking && (
											<div className="whitespace-pre-wrap break-words text-white/70">{thinking}</div>
										)}
										{debug && debugLines.length > 0 && (
											<div className="mt-2 rounded bg-black/30 p-2 text-[11px] text-white/70">
												<div className="mb-1 opacity-70">debug:</div>
												<pre className="whitespace-pre-wrap break-all">{debugLines.join('\n')}</pre>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					))}
					<div ref={bottomRef} />
				</div>
				{hasNewBelow && !atBottom && (
					<button
						onClick={()=>{ bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setHasNewBelow(false) }}
						className="pointer-events-auto fixed right-4 bottom-4 z-20 rounded-full border border-white/10 bg-blue-600/90 px-3 py-2 text-xs hover:bg-blue-600"
					>
						มีข้อความใหม่ • เลื่อนลง
					</button>
				)}
				{/* Floating scroll controls */}
				<div className="pointer-events-none fixed right-4 bottom-24 z-20 flex flex-col gap-2">
					<button
						onClick={()=>{ const el = scrollRef.current; if (el) el.scrollTo({ top: 0, behavior: 'smooth' }) }}
						disabled={atTop}
						className={`pointer-events-auto rounded-full border px-3 py-2 text-xs ${atTop ? 'opacity-40' : 'opacity-90 hover:bg-white/10'} bg-gray-900/80 border-white/10`}
					>
						↑ ขึ้นบนสุด
					</button>
					<button
						onClick={()=>{ bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
						disabled={atBottom}
						className={`pointer-events-auto rounded-full border px-3 py-2 text-xs ${atBottom ? 'opacity-40' : 'opacity-90 hover:bg-white/10'} bg-gray-900/80 border-white/10`}
					>
						↓ ลงล่างสุด
					</button>
				</div>
			</main>
			<footer className="sticky bottom-0 z-10 border-t border-white/10 bg-gray-900/80 backdrop-blur">
				<div className="mx-auto max-w-3xl px-4 py-3">
					<div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-gray-800 p-2">
						<button
							className="rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10"
							title="แนบรูปภาพ"
							onClick={() => fileInputRef.current?.click()}
						>
							＋
						</button>
						{/* Prompt actions menu */}
						<div className="relative">
							<details>
								<summary className="list-none rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10 cursor-pointer" aria-label="Prompt menu">⋯</summary>
								<div className="absolute right-0 z-10 mt-1 min-w-40 rounded-md border border-white/10 bg-gray-900 p-1 text-xs shadow-lg">
									<button onClick={()=> fileInputRef.current?.click()} className="block w-full rounded px-2 py-1 text-left hover:bg-white/10">แนบรูปภาพ…</button>
									<button onClick={()=> { setInput(''); setAttachments([]) }} className="block w-full rounded px-2 py-1 text-left hover:bg-white/10">ล้างข้อความ</button>
									{loading ? (
										<button onClick={stop} className="block w-full rounded px-2 py-1 text-left text-red-300 hover:bg-red-500/10">หยุด</button>
									) : (
										<button onClick={send} className="block w-full rounded px-2 py-1 text-left hover:bg-white/10" disabled={(input.trim().length === 0 && attachments.length === 0)}>ส่ง</button>
									)}
								</div>
							</details>
						</div>
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
							<button onClick={stop} className="rounded-lg bg-red-600 px-4 py-2 text-sm">หยุด</button>
						) : (
							<button onClick={send} className="rounded-lg bg-blue-600 px-4 py-2 text-sm disabled:opacity-50" disabled={(input.trim().length === 0 && attachments.length === 0)}>ส่ง</button>
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
					<p className="mt-2 text-center text-xs text-white/40">แนบ PNG/JPEG ได้สูงสุด ~8MB ต่อไฟล์</p>
				</div>
			</footer>
		</div>
	)
}


