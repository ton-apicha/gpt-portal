import { test, expect } from '@playwright/test'

function mockFetchStreamScript() {
	return (
		function () {
			const originalFetch = window.fetch
			window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
				const url = typeof input === 'string' ? input : (input as Request).url
				if (url.includes('/api/chat')) {
					const encoder = new TextEncoder()
					const body = new ReadableStream<Uint8Array>({
						start(controller) {
							const chunks = ['สว', 'ัสดี', 'ครับ']
							let i = 0
							function push() {
								if (i < chunks.length) {
									controller.enqueue(encoder.encode(chunks[i++]))
									setTimeout(push, 20)
								} else {
									controller.close()
								}
							}
							push()
						},
					})
					return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
				}
				return originalFetch(input as any, init)
			}
		} as any
	)
}

test.describe('Chat page', () => {
	test('should send message and render streamed reply', async ({ page }) => {
		await page.addInitScript(mockFetchStreamScript())
		await page.goto('/chat')
		const textarea = page.getByPlaceholder('พิมพ์ข้อความ')
		await textarea.fill('ทดสอบ')
		await page.getByRole('button', { name: 'ส่ง' }).click()

		await expect(page.getByText('คุณ: ทดสอบ')).toBeVisible()
		const assistant = page.locator('[data-testid="assistant-msg"]').last()
		await expect(assistant).toContainText('สวัสดีครับ', { timeout: 7000 })
	})
})
