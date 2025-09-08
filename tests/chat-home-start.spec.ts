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
							const chunks = ['โอ', 'เ', 'ค']
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

// 1) เข้าที่ /chat แล้วควรถูกพาไป /chat/{id} อัตโนมัติ
test('visiting /chat auto-creates a chat and navigates', async ({ page }) => {
	await page.goto('/chat', { waitUntil: 'domcontentloaded' })
	await expect(page).toHaveURL(/\/chat\//)
})

// 2) ส่งต่อ ?q ไปยังหน้าที่สร้างใหม่และเริ่มถามอัตโนมัติ
test('visiting /chat?q=... starts with the question and streams reply', async ({ page }) => {
	await page.addInitScript(mockStreamReply())
	await page.goto('/chat?q=สวัสดี', { waitUntil: 'domcontentloaded' })
	await expect(page).toHaveURL(/\/chat\//)
	await expect(page.getByText('สวัสดี')).toBeVisible()
	await expect(page.getByText('โอเค')).toBeVisible({ timeout: 5000 })
})
