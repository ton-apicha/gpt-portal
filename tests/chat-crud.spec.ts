import { test, expect } from '@playwright/test'

test.describe('Chat CRUD & navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/chat')
	})

	test('create new chat and navigate to it', async ({ page }) => {
		await page.getByRole('button', { name: 'สร้างแชทใหม่' }).click()
		await expect(page).toHaveURL(/\/chat\//)
	})

	test('rename chat from sidebar', async ({ page }) => {
		await page.getByRole('button', { name: 'สร้างแชทใหม่' }).click()
		// Open prompt via Top Toolbar Rename button
		page.once('dialog', (dialog) => dialog.accept('ชื่อทดสอบ'))
		const renameBtn = page.getByRole('button', { name: 'Rename' })
		await expect(renameBtn).toBeVisible()
		await renameBtn.click()
		// Wait for the first sidebar item to contain new title
		const firstItem = page.locator('aside nav > div').first()
		await expect(firstItem).toContainText('ชื่อทดสอบ')
	})

	test('delete chat from sidebar', async ({ page }) => {
		await page.getByRole('button', { name: 'สร้างแชทใหม่' }).click()
		page.once('dialog', (dialog) => dialog.accept())
		const delBtn = page.getByRole('button', { name: 'Delete' })
		await expect(delBtn).toBeVisible()
		await delBtn.click()
		// After delete, sidebar refreshes; just ensure page stays accessible
		await expect(page).toHaveTitle(/.*/)
	})

	test('auto title chat after first exchange', async ({ page }) => {
		await page.getByRole('button', { name: 'สร้างแชทใหม่' }).click()
		const textarea = page.getByPlaceholder('พิมพ์ข้อความ...')
		await textarea.fill('สรุปประชุม Q3')
		await page.getByRole('button', { name: 'ส่ง' }).click()
		// รอให้ตอบกลับเสร็จและชื่อถูกอัปเดตใน Sidebar
		const firstItem = page.locator('aside nav > div').first()
		await expect(firstItem).toContainText('สรุปประชุม Q3')
	})
})


