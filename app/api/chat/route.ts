import { NextRequest } from 'next/server'
import { getAllSettings } from '@/lib/settings'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

export async function POST(req: NextRequest) {
	const { messages } = await req.json()
	const encoder = new TextEncoder()
	const url = new URL(req.url)
	const admin = await getAllSettings()
	const timeoutMs = Number(url.searchParams.get('timeoutMs') ?? admin.timeoutMs ?? 90000)
	const maxTokensRaw = parseInt(url.searchParams.get('maxTokens') || admin.maxTokens || '512')
	const maxTokens = Math.max(64, Math.min(isNaN(maxTokensRaw) ? parseInt(admin.maxTokens || '512') : maxTokensRaw, 4096))
	const model = url.searchParams.get('model') || admin.model || 'llama3.2-vision'
	const temperature = parseFloat(url.searchParams.get('temperature') || admin.temperature || '0.7')
	const top_p = parseFloat(url.searchParams.get('top_p') || admin.top_p || '0.9')

	const stream = new ReadableStream<Uint8Array>({
		start: async (controller) => {
			try {
				const ac = new AbortController()
				const timer = setTimeout(() => ac.abort('timeout'), timeoutMs)
				let tokenCount = 0
				const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model,
						messages: (messages ?? []).map((m: any) => ({ role: m.role, content: m.content })),
						stream: true,
						options: {
							num_predict: maxTokens,
							temperature,
							top_p,
						},
					}),
					signal: ac.signal,
				})
				const reader = res.body?.getReader()
				if (!reader) throw new Error('no-reader')
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
								tokenCount += 1
								controller.enqueue(encoder.encode(chunk))
							}
							if (data?.done) {
								clearTimeout(timer)
								controller.close()
								return
							}
						} catch {}
					}
				}
				clearTimeout(timer)
				controller.close()
			} catch (e: any) {
				controller.error(e)
			}
		},
	})

	return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
