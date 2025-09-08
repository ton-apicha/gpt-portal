import { test, expect } from '@playwright/test'

test('admin system page loads and shows cards', async ({ page }) => {
  await page.context().addCookies([{ name: 'e2e_role', value: 'ADMIN', domain: 'localhost', path: '/' }])
  await page.goto('/admin/system')
  await expect(page.getByText('Admin • System')).toBeVisible()
  await expect(page.getByText('Node')).toBeVisible()
})


