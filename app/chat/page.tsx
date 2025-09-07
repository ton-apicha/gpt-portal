"use client"
import { useRef, useState, useEffect, KeyboardEvent } from 'react'

type Msg = { id: string; role: 'user'|'assistant'; content: string }

export default function ChatPage(){
	const [messages, setMessages] = useState<Msg[]>([])
	const [input, setInput] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const boxRef = useRef<HTMLDivElement>(null)
	const abortRef = useRef<AbortController | null>(null)

	useEffect(()=>{ boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])

	function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>){
		if (e.key === 'Enter' && !e.shiftKey){
			e.preventDefault()
			send()
		}
	}

	async function send(){
		if(!input.trim() || loading) return
		const user: Msg = { id: crypto.randomUUID(), role: 'user', content: input }
		setMessages(m=>[...m, user])
		setInput('')
		setError(null)
		setLoading(true)
		abortRef.current?.abort()
		abortRef.current = new AbortController()
		try{
			const res = await fetch('/api/chat?timeoutMs=30000', {
				method: 'POST',
				body: JSON.stringify({ messages: [...messages, user] }),
				signal: abortRef.current.signal,
			})
			if (!res.ok || !res.body) throw new Error('chat-api-unavailable')
			const reader = res.body?.getReader()
			if (!reader) return
			const dec = new TextDecoder()
			let assistant: Msg = { id: crypto.randomUUID(), role: 'assistant', content: '' }
			setMessages(m=>[...m, assistant])
			while(true){
				const { done, value } = await reader.read()
				if (done) break
				assistant = { ...assistant, content: assistant.content + dec.decode(value) }
				setMessages(m=>m.map(x=>x.id===assistant.id?assistant:x))
			}
		}catch(err: any){
			if (!(err?.name === 'AbortError' || err?.code === 20)) setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้')
		} finally {
			setLoading(false)
		}
	}

	function stop(){
		if (abortRef.current){
			try { abortRef.current.abort('user-cancel') } catch {}
			abortRef.current = null
		}
		setLoading(false)
	}

	return (
		<div className="min-h-screen bg-black text-gray-100">
			<div className="mx-auto max-w-5xl px-4 py-6">
				<header className="flex items-center justify-between pb-4 border-b border-white/10">
					<h1 className="text-xl font-semibold">ห้องแชท AI</h1>
					<div className="text-xs text-white/50">กด Enter เพื่อส่ง • Shift+Enter ขึ้นบรรทัดใหม่</div>
				</header>

				<div ref={boxRef} className="mt-4 h-[62vh] overflow-y-auto rounded-lg border border-white/10 bg-zinc-900/30 p-4">
					{messages.length === 0 && (
						<div className="h-full grid place-items-center text-white/40">เริ่มพิมพ์ข้อความเพื่อคุยกับผู้ช่วย</div>
					)}
					<ul className="space-y-3">
						{messages.map((m)=> (
							<li key={m.id} className={m.role==='user' ? 'flex justify-end' : 'flex justify-start'}>
								<div
									data-testid={m.role==='assistant' ? 'assistant-msg' : undefined}
									className={
										`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow backdrop-blur `+
										(m.role==='user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white/5 border border-white/10 rounded-bl-sm')
									}
								>
									{m.role==='user' ? 'คุณ' : 'ผู้ช่วย'}: {m.content}
								</div>
							</li>
						))}
					</ul>
				</div>

				{error && (
					<div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
						{error}
					</div>
				)}

				<div className="mt-4 flex items-end gap-3">
					<textarea
						className="flex-1 min-h-[56px] max-h-52 resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-indigo-400"
						placeholder="พิมพ์ข้อความ"
						value={input}
						onChange={e=>setInput(e.target.value)}
						onKeyDown={onKeyDown}
					/>
					<button
						onClick={send}
						disabled={loading}
						className="h-11 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
					>
						ส่ง
					</button>
					<button
						onClick={stop}
						disabled={!loading}
						className="h-11 rounded-lg border border-white/20 px-4 text-sm text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
					>
						หยุด
					</button>
				</div>

				{loading && (
					<div className="mt-2 flex items-center gap-2 text-xs text-white/50">
						<div className="h-2 w-2 animate-pulse rounded-full bg-white/60"></div>
						กำลังสร้างคำตอบ...
					</div>
				)}
			</div>
		</div>
	)
}
