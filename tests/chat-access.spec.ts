import { test, expect } from '@playwright/test'

async function createChat(page){
	await page.goto('/chat')
	await page.waitForLoadState('domcontentloaded')
	// เริ่มแชทใหม่
	const chatId = await page.evaluate(async () => {
		const res = await fetch('/api/chats', { method: 'POST' })
		const chat = await res.json()
		return chat.id
	})
	expect(chatId).toBeTruthy()
	return chatId
}

async function sendMessage(page, chatId: string, text: string){
	const resp = await page.request.post(`/api/chats/${chatId}/messages?timeoutMs=10`, { data: { content: text } })
	expect(resp.ok()).toBeTruthy()
}

test.describe('Chat access control', () => {
	test('user cannot access other user chats', async ({ page, request, browser }) => {
		// ผู้ใช้ A
		await page.goto('/chat', { waitUntil: 'domcontentloaded', headers: { 'x-e2e-role': 'USER' } as any })
		const chatA = await createChat(page)
		await sendMessage(page, chatA, 'hello from A')

		// ผู้ใช้ B ใช้ context ใหม่ พร้อม header บังคับ role USER
		const ctxB = await browser.newContext({ extraHTTPHeaders: { 'x-e2e-role': 'USER' } })
		const pageB = await ctxB.newPage()
		await pageB.goto('/chat', { waitUntil: 'domcontentloaded' })

		// ผู้ใช้ B ลองอ่านข้อความของแชท A -> ควร 404
		const res1 = await pageB.request.get(`/api/chats/${chatA}/messages`)
		expect(res1.status()).toBe(404)

		// ผู้ใช้ B สร้างแชทของตนเองและส่งข้อความ
		const chatB = await createChat(pageB)
		await sendMessage(pageB, chatB, 'hello from B')

		// ผู้ใช้ A ลองอ่านแชท B -> ควร 404
		const res2 = await page.request.get(`/api/chats/${chatB}/messages`, { headers: { 'x-e2e-role': 'USER' } as any })
		expect(res2.status()).toBe(404)

		await ctxB.close()
	})
})
