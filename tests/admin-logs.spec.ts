import { test, expect } from '@playwright/test'

test('admin logs page loads and shows table headers', async ({ page }) => {
  await page.context().addCookies([{ name: 'e2e_role', value: 'ADMIN', domain: 'localhost', path: '/' }])
  await page.goto('/admin/logs')
  await expect(page.getByText('Admin • Logs')).toBeVisible()
  await expect(page.getByText('Time')).toBeVisible()
  await expect(page.getByText('Level')).toBeVisible()
  await expect(page.getByText('Event')).toBeVisible()
})


