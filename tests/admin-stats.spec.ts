import { test, expect } from '@playwright/test'

test('admin stats shows cards', async ({ page }) => {
  await page.context().addCookies([{ name: 'e2e_role', value: 'ADMIN', domain: 'localhost', path: '/' }])
  await page.goto('/admin/stats')
  await expect(page.getByText('Admin • Stats')).toBeVisible()
  await expect(page.getByText('Users')).toBeVisible()
  await expect(page.getByText('Chats')).toBeVisible()
  await expect(page.getByText('Messages total')).toBeVisible()
  await expect(page.getByText('Messages (24h)')).toBeVisible()
})


