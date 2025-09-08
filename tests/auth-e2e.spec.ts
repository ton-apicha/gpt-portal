import { test, expect } from '@playwright/test'

function uniqueEmail(prefix: string){
	return `${prefix}-${Date.now()}@example.com`
}

async function register(request: any, email: string, password: string, name='Test User'){
	const res = await request.post('/api/register', { data: { email, password, name } })
	expect(res.ok()).toBeTruthy()
}

async function login(page: any, email: string, password: string){
	await page.goto('/login')
	await page.fill('input[placeholder="อีเมล"]', email)
	await page.fill('input[placeholder="รหัสผ่าน"]', password)
	await page.click('button:has-text("เข้าสู่ระบบ")')
	await page.waitForURL(/^(?!.*\/login).*$/)
}

async function logoutFromChat(page: any){
	await page.goto('/chat')
	await page.getByRole('button', { name: 'Account ▾' }).click()
	await page.getByRole('button', { name: 'Logout' }).click()
	await page.waitForURL(/\/login/)
}

test.describe('Auth E2E', () => {
	test('register, login and logout works', async ({ page }) => {
		const email = uniqueEmail('user1')
		const password = 'pass1234'
		await register(page.request, email, password)
		await login(page, email, password)
		// verify access by loading profile API
		const profile = await page.request.get('/api/profile')
		expect(profile.ok()).toBeTruthy()
		await logoutFromChat(page)
	})

	test('reset password flow works', async ({ page }) => {
		const email = uniqueEmail('user2')
		const password = 'pass1234'
		await register(page.request, email, password)
		// request reset token (dev returns token)
		const req = await page.request.post('/api/auth/reset/request', { data: { email } })
		const data = await req.json()
		expect(data.ok).toBeTruthy()
		expect(data.token).toBeTruthy()
		const newPass = 'newpass5678'
		const conf = await page.request.post('/api/auth/reset/confirm', { data: { token: data.token, password: newPass } })
		const confData = await conf.json()
		expect(confData.ok).toBeTruthy()
		// login with new password
		await login(page, email, newPass)
	})

	test('admin can promote user to ADMIN and access admin endpoints', async ({ page }) => {
		const email = uniqueEmail('user3')
		const password = 'pass1234'
		await register(page.request, email, password)
		await login(page, email, password)
		// get user id
		const profileRes = await page.request.get('/api/profile')
		const profile = await profileRes.json()
		const userId = profile.user.id
		// promote via admin API using e2e header to simulate admin performer
		const promote = await page.request.patch('/api/admin/users', { headers: { 'x-e2e-role': 'ADMIN', 'content-type': 'application/json' }, data: { userId, role: 'ADMIN' } })
		expect(promote.ok()).toBeTruthy()
		// re-login to refresh session role
		await logoutFromChat(page)
		await login(page, email, password)
		// access admin users API without bypass header (should pass due to role in DB)
		const list = await page.request.get('/api/admin/users')
		expect(list.ok()).toBeTruthy()
	})
})
