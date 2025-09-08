import { test, expect } from '@playwright/test'

const pages = [
	{ url: '/login', title: 'เข้าสู่ระบบ • AI Portal' },
	{ url: '/reset', title: 'ลืมรหัสผ่าน • AI Portal' },
	{ url: '/register', title: 'สมัครสมาชิก • AI Portal' },
	{ url: '/chat', title: 'แชท • AI Portal', auth: true },
	{ url: '/settings', title: 'Settings • AI Portal', auth: true },
	{ url: '/profile', title: 'โปรไฟล์ • AI Portal', auth: true },
	{ url: '/sessions', title: 'Sessions • AI Portal', auth: true },
	{ url: '/admin', title: 'Admin • AI Portal', admin: true },
	{ url: '/admin/users', title: 'Admin • Users • AI Portal', admin: true },
	{ url: '/admin/logs', title: 'Admin • Logs • AI Portal', admin: true },
	{ url: '/admin/settings', title: 'Admin • Settings • AI Portal', admin: true },
	{ url: '/admin/system', title: 'Admin • System • AI Portal', admin: true },
	{ url: '/admin/stats', title: 'Admin • Stats • AI Portal', admin: true },
	{ url: '/admin/model', title: 'Admin • Models • AI Portal', admin: true },
	{ url: '/status', title: 'Status • AI Portal' },
]

for (const p of pages){
	test(`title check: ${p.url}`, async ({ page }) => {
		if (p.admin) {
			await page.context().addCookies([{ name: 'e2e_role', value: 'ADMIN', domain: 'localhost', path: '/' }])
		} else if (p.auth) {
			await page.context().addCookies([{ name: 'e2e_role', value: 'USER', domain: 'localhost', path: '/' }])
		}
		await page.goto(p.url, { waitUntil: 'domcontentloaded' })
		await expect(page).toHaveTitle(p.title)
	})
}
