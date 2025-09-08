import { test, expect } from '@playwright/test'

function mockStreamReply() {
	return (
		function () {
			const originalFetch = window.fetch
			window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
				const url = typeof input === 'string' ? input : (input as Request).url
				if (typeof url === 'string' && url.includes('/api/chats/') && url.includes('/messages') && (init?.method === 'POST')) {
					const encoder = new TextEncoder()
					const body = new ReadableStream<Uint8Array>({
						start(controller) {
							const chunks = ['เริ่ม', 'ตอบ', 'แล้ว']
							let i = 0
							function push(){
								if (i < chunks.length) {
									controller.enqueue(encoder.encode(chunks[i++]))
									setTimeout(push, 15)
								} else {
									controller.close()
								}
							}
							push()
						}
					})
					return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
				}
				return originalFetch(input as any, init)
			}
		} as any
	)
}

test('click suggestion on /chat creates a chat and auto starts', async ({ page }) => {
	await page.addInitScript(mockStreamReply())
	await page.goto('/chat', { waitUntil: 'domcontentloaded' })
	// คลิกการ์ดคำแนะนำแรก
	const firstSuggestion = page.locator('main button').first()
	const text = await firstSuggestion.innerText()
	await firstSuggestion.click()
	await expect(page).toHaveURL(/\/chat\//)
	// ต้องเห็นข้อความคำถาม (จาก q) และเริ่มสตรีมตอบ
	await expect(page.getByText(text.split('\n')[0])).toBeVisible()
	await expect(page.getByText('เริ่มตอบแล้ว')).toBeVisible({ timeout: 5000 })
})
