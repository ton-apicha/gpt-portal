import { NextRequest, NextResponse } from 'next/server'
import { getSessionOrBypass } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'
import { recordChatMetrics } from '@/lib/metrics'
import { recordLog } from '@/lib/logs'
import { getAllSettings } from '@/lib/settings'

export const runtime = 'nodejs'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
	const session = await getSessionOrBypass()
	if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const chat = await prisma.chat.findFirst({ where: { id: params.id, userId: session.user.id as string } })
	if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

	const url = new URL(req.url)
	const beforeId = url.searchParams.get('beforeId')
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100)

	let where: any = { chatId: params.id }
	if (beforeId) {
		const ref = await prisma.message.findUnique({ where: { id: beforeId } })
		if (ref) {
			where = { chatId: params.id, createdAt: { lt: ref.createdAt } }
		}
	}

	const older = await prisma.message.findMany({
		where,
		orderBy: { createdAt: 'desc' },
		take: limit,
		select: { id: true, role: true, content: true, createdAt: true },
	})
	const ordered = older.reverse()
	const nextBeforeId = ordered.length > 0 ? ordered[0].id : null
	return NextResponse.json({ messages: ordered, nextBeforeId })
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
	const url = new URL(req.url)
	const admin = await getAllSettings()
	const timeoutMs = parseInt(url.searchParams.get('timeoutMs') || admin.timeoutMs || '90000')
	const maxTokensRaw = parseInt(url.searchParams.get('maxTokens') || admin.maxTokens || '512')
	const maxTokens = Math.max(64, Math.min(isNaN(maxTokensRaw) ? parseInt(admin.maxTokens || '512') : maxTokensRaw, 4096))
	const model = url.searchParams.get('model') || admin.model || 'llama3.2-vision'
	const temperature = parseFloat(url.searchParams.get('temperature') || admin.temperature || '0.7')
	const top_p = parseFloat(url.searchParams.get('top_p') || admin.top_p || '0.9')
	const debug = url.searchParams.get('debug') === '1'

	const stream = new ReadableStream<Uint8Array>({
		start: async (controller) => {
			const startedAt = Date.now()
			const abortController = new AbortController()
			const timer = setTimeout(() => abortController.abort('timeout'), timeoutMs)
			try {
				try { await recordLog({ level: 'INFO', event: 'CHAT_STREAM_START', userId: session.user.id as string, chatId: chat.id, model: 'llama3.2-vision' }) } catch {}
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
				// Retry with simple exponential backoff
				const maxAttempts = 3
				let attempt = 0
				let res: Response | null = null
				let lastErr: any = null
				const urlModel = model
				// เปิดโหมดคิดสำหรับรุ่น reasoning กว้างขึ้น (รวม gpt-oss ทุกขนาด และตระกูล r1)
				const shouldThink = /(gpt-oss)|(:120b)|deepseek[-:]?r1|\br1\b|reason|think/i.test(urlModel)
				while (attempt < maxAttempts) {
					try {
						res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								model: urlModel,
								messages: history.map((m, idx) => {
									if (idx === history.length - 1 && imagesBase64.length > 0) {
										return { role: m.role, content: m.content, images: imagesBase64 }
									}
									return { role: m.role, content: m.content }
								}),
								stream: true,
								think: shouldThink,
								options: { num_predict: maxTokens, temperature, top_p },
							}),
							signal: abortController.signal,
						})
						if (!res.ok || !res.body) throw new Error(`Upstream error ${res.status}`)
						lastErr = null
						break
					} catch (e) {
						lastErr = e
						attempt += 1
						if (attempt >= maxAttempts) break
						const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 4000)
						await new Promise((r) => setTimeout(r, backoff))
					}
				}
				if (!res || !res.ok || !res.body) throw lastErr || new Error('Upstream unavailable')
				const reader = res.body.getReader()
				let buf = ''
				const dec = new TextDecoder()
				let tokenCount = 0
				let accThinkingText = ''
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					buf += dec.decode(value, { stream: true })
					const lines = buf.split(/\r?\n/)
					buf = lines.pop() || ''
					for (const line of lines) {
						if (!line.trim()) continue
						try {
							const data = JSON.parse(line)
							if (debug) { controller.enqueue(encoder.encode(JSON.stringify({ type: 'debug', line }) + '\n')) }
							// Reasoning/thinking variants across versions
							const thinkCandidate: string | undefined =
								data?.message?.thinking ??
								data?.thinking ??
								data?.reasoning ??
								(data?.type && String(data.type).toLowerCase().includes('reason') ? (data?.content ?? data?.message?.content) : undefined)
							if (shouldThink && typeof thinkCandidate === 'string' && thinkCandidate.length > 0) {
								// Support both cumulative and delta streams
								let delta = ''
								if (thinkCandidate.startsWith(accThinkingText)) {
									delta = thinkCandidate.slice(accThinkingText.length)
								} else {
									// treat as pure delta
									delta = thinkCandidate
								}
								if (delta) {
									accThinkingText += delta
									controller.enqueue(encoder.encode(JSON.stringify({ type: 'thinking', delta }) + '\n'))
								}
							}
							// Content token variants for /chat and /generate
							const chunk: string | undefined = data?.message?.content ?? data?.response ?? (data?.type === 'message' ? data?.content : undefined)
							if (chunk) {
								assistantReply += chunk
								controller.enqueue(encoder.encode(JSON.stringify({ type: 'content', delta: chunk }) + '\n'))
								tokenCount += 1
							}
							if (data?.done || String(data?.type || '').toLowerCase() === 'done') {
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
								// metrics success
								try { await recordChatMetrics({ userId: session.user.id as string, chatId: chat.id, model: urlModel, status: 'OK', tokenCount, latencyMs: Date.now() - startedAt }) } catch {}
								try { await recordLog({ level: 'INFO', event: 'CHAT_STREAM_OK', userId: session.user.id as string, chatId: chat.id, model: urlModel, message: `tokens=${tokenCount}` }) } catch {}
								controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
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
					try { await recordChatMetrics({ userId: session.user.id as string, chatId: chat.id, model, status: 'TIMEOUT', tokenCount: 0, latencyMs: Date.now() - startedAt }) } catch {}
					try { await recordLog({ level: 'WARN', event: 'CHAT_STREAM_TIMEOUT', userId: session.user.id as string, chatId: chat.id, model }) } catch {}
					controller.close()
				} else {
					try { await recordChatMetrics({ userId: session.user.id as string, chatId: chat.id, model, status: 'ERROR', tokenCount: 0, latencyMs: Date.now() - startedAt }) } catch {}
					try { await recordLog({ level: 'ERROR', event: 'CHAT_STREAM_ERROR', userId: session.user.id as string, chatId: chat.id, model, message: String(e?.message || e) }) } catch {}
					controller.error(e)
				}
			}
		},
	})

	return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' } })
}


