import { test, expect } from '@playwright/test'

function mockStreamMarkdown() {
	return (
		function(){
			const originalFetch = window.fetch
			window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
				const url = typeof input === 'string' ? input : (input as Request).url
				if (typeof url === 'string' && url.includes('/api/chats/') && url.includes('/messages')) {
					const encoder = new TextEncoder()
					const md = 'นี่คือโค้ด:\n\n```ts\nconst x: number = 1\nconsole.log(x)\n```\n\n- รายการหนึ่ง\n- รายการสอง'
					const body = new ReadableStream<Uint8Array>({
						start(controller){
							controller.enqueue(encoder.encode(md))
							controller.close()
						}
					})
					return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
				}
				return originalFetch(input as any, init)
			}
		} as any
	)
}

test('render markdown with code highlight', async ({ page }) => {
	await page.addInitScript(mockStreamMarkdown())
	await page.goto('/chat')
	await expect(page).toHaveURL(/\/chat\//)
	const textarea = page.getByPlaceholder('พิมพ์ข้อความ...')
	await textarea.fill('ทดสอบ markdown')
	await page.getByRole('button', { name: 'ส่ง' }).click()
	// ตรวจว่ามี code block และรายการ bullet
	await expect(page.locator('pre code')).toContainText('const x: number = 1')
	await expect(page.getByRole('list')).toBeVisible()
})


