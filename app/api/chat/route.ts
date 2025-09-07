import { NextRequest } from 'next/server'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

export async function POST(req: NextRequest) {
	const { messages } = await req.json()
	const encoder = new TextEncoder()
	const url = new URL(req.url)
	const timeoutMs = Number(url.searchParams.get('timeoutMs') ?? 30000)

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
						model: 'llama3.2-vision',
						messages: (messages ?? []).map((m: any) => ({ role: m.role, content: m.content })),
						stream: true,
						options: {
							num_predict: 128,
							temperature: 0.7,
							top_p: 0.9,
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
				if (e?.name === 'AbortError') {
					// ปิดสตรีมอย่างสุภาพ เพื่อไม่ให้ฝั่ง client โยน TypeError: Failed to fetch
					controller.close()
					return
				}
				controller.error(e)
			}
		},
	})

	return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
