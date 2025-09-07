import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const chat = await prisma.chat.findFirst({ where: { id: params.id, userId: session.user.id as string } })
	if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 })
	const messages = await prisma.message.findMany({
		where: { chatId: params.id },
		orderBy: { createdAt: 'asc' },
	})
	return NextResponse.json(messages)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const chat = await prisma.chat.findFirst({ where: { id: params.id, userId: session.user.id as string } })
	if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

	const { content } = await req.json()
	if (typeof content !== 'string' || content.trim().length === 0) {
		return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
	}

	// Save user message first
	const savedUser = await prisma.message.create({ data: { chatId: chat.id, role: 'user', content: content.trim() } })

	const encoder = new TextEncoder()
	let assistantReply = ''
	const timeoutMs = parseInt(req.nextUrl.searchParams.get('timeoutMs') || '30000')

	const stream = new ReadableStream<Uint8Array>({
		start: async (controller) => {
			const abortController = new AbortController()
			const timer = setTimeout(() => abortController.abort('timeout'), timeoutMs)
			try {
				const history = await prisma.message.findMany({
					where: { chatId: chat.id },
					orderBy: { createdAt: 'asc' },
					select: { role: true, content: true },
				})

				// If last message contains local image markdown, load and attach base64 for vision
				let imagesBase64: string[] = []
				try {
					const last = history[history.length - 1]
					if (last && last.role === 'user') {
						const matches = Array.from(last.content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g))
						for (const m of matches) {
							const url = m[1]
							if (typeof url === 'string' && url.startsWith('/uploads/')) {
								const fp = path.join(process.cwd(), 'public', url.replace(/^\//, ''))
								const buf = await fs.readFile(fp)
								imagesBase64.push(buf.toString('base64'))
							}
						}
					}
				} catch {}
				const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model: 'llama3.2-vision',
						messages: history.map((m, idx) => {
							if (idx === history.length - 1 && imagesBase64.length > 0) {
								return { role: m.role, content: m.content, images: imagesBase64 }
							}
							return { role: m.role, content: m.content }
						}),
						stream: true,
						options: { num_predict: 128, temperature: 0.7, top_p: 0.9 },
					}),
					signal: abortController.signal,
				})
				if (!res.ok || !res.body) throw new Error(`Upstream error ${res.status}`)
				const reader = res.body.getReader()
				let buf = ''
				const dec = new TextDecoder()
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					buf += dec.decode(value)
					const lines = buf.split('\n')
					buf = lines.pop() || ''
					for (const line of lines) {
						if (!line.trim()) continue
						try {
							const data = JSON.parse(line)
							const chunk: string | undefined = data?.message?.content
							if (chunk) {
								assistantReply += chunk
								controller.enqueue(encoder.encode(chunk))
							}
							if (data?.done) {
								clearTimeout(timer)
								await prisma.message.create({ data: { chatId: chat.id, role: 'assistant', content: assistantReply } })
								// Auto-title: if this is a new chat, set title from the first user message (trimmed)
								let newTitle: string | null = null
								try {
									const firstUser = history.find((m) => m.role === 'user')
									if (firstUser) {
										const raw = firstUser.content.replace(/\s+/g, ' ').trim()
										newTitle = raw.slice(0, 40)
									}
								} catch {}
								if (newTitle && chat.title === 'New Chat') {
									await prisma.chat.update({ where: { id: chat.id }, data: { title: newTitle, updatedAt: new Date() } })
									try { self.dispatchEvent(new Event('chats:refresh')) } catch {}
								} else {
									await prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } })
								}
								controller.close()
								return
							}
						} catch {}
					}
				}
				controller.close()
			} catch (e: any) {
				clearTimeout(timer)
				if (e?.name === 'AbortError') {
					controller.close()
				} else {
					controller.error(e)
				}
			}
		},
	})

	return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}


