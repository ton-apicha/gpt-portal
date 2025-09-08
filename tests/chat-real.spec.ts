import { test, expect } from '@playwright/test'

test.describe('Chat real E2E (no mocks)', () => {
	// ใช้ flow จริง: เข้า /chat ให้ระบบสร้างแชทใหม่อัตโนมัติ แล้วพิมพ์และส่งข้อความ
	test('create chat from /chat and send a real message', async ({ page }) => {
		await page.goto('/chat')
		await expect(page).toHaveURL(/\/chat\//)

		// พิมพ์และส่งข้อความจริง
		const textarea = page.getByPlaceholder('พิมพ์ข้อความ...')
		await textarea.fill('ทดสอบการสนทนาจริง')
		await page.getByRole('button', { name: 'ส่ง' }).click()

		// เห็นข้อความของผู้ใช้ในพื้นที่หลัก ไม่ชนกับรายการแชทด้านข้าง
		const main = page.locator('main').first()
		await expect(main.getByText(/ทดสอบการสนทนาจริง/)).toBeVisible()

		// รอให้มีปุ่มคัดลอกคำตอบ ปรากฏ แปลว่ามีข้อความผู้ช่วยเรนเดอร์จริง
		await expect(page.getByTestId('copy-reply')).toBeVisible({ timeout: 30000 })
	})
})


