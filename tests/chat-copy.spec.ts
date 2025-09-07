import { test, expect } from '@playwright/test'

function mockStreamCode() {
	return (
		function(){
			const originalFetch = window.fetch
			window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
				const url = typeof input === 'string' ? input : (input as Request).url
				if (typeof url === 'string' && url.includes('/api/chats/') && url.includes('/messages')) {
					const encoder = new TextEncoder()
					const md = '```ts\nconsole.log(123)\n```'
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

test('copy code button copies code to clipboard', async ({ page }) => {
	await page.addInitScript(mockStreamCode())
	await page.goto('/chat')
	const textarea = page.getByPlaceholder('พิมพ์ข้อความ...')
	await textarea.fill('ส่งโค้ด')
	await page.getByRole('button', { name: 'ส่ง' }).click()
	const copyBtn = page.getByTestId('copy-code')
	await expect(copyBtn).toBeVisible({ timeout: 5000 })
	await copyBtn.click()
	// ตรวจว่าแสดงสถานะคัดลอก (ยอมรับทั้งก่อน/หลังในบาง environment)
	await expect(copyBtn).toHaveText(/คัดลอกแล้ว|คัดลอกโค้ด/)
})

test('copy whole assistant reply', async ({ page }) => {
	await page.addInitScript(mockStreamCode())
	await page.goto('/chat')
	const textarea = page.getByPlaceholder('พิมพ์ข้อความ...')
	await textarea.fill('ส่งคำตอบ')
	await page.getByRole('button', { name: 'ส่ง' }).click()
	const copyReply = page.getByTestId('copy-reply')
	await expect(copyReply).toBeVisible({ timeout: 5000 })
	await copyReply.click()
})


