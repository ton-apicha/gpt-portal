import { test, expect } from '@playwright/test'

async function pullModel(request: any, name: string){
	const res = await request.post('/api/admin/model', { headers: { 'x-test-bypass': '1' }, data: { action: 'pull', model: name } })
	expect(res.ok()).toBeTruthy()
}

test.describe('Admin Models', () => {
	test('shows list and can pull gpt-oss:120b', async ({ page }) => {
		await page.context().addCookies([{ name: 'e2e_role', value: 'ADMIN', domain: 'localhost', path: '/' }])
		await pullModel(page.request, 'gpt-oss:120b')
		await page.goto('/admin/model', { waitUntil: 'domcontentloaded' })
		await expect(page.getByText('Admin • Models')).toBeVisible()
		await expect(page.getByText('Installed')).toBeVisible()
		await expect(page.getByText('gpt-oss:120b')).toBeVisible()
	})
})


