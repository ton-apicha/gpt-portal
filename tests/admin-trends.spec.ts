import { test, expect } from '@playwright/test'

test('admin trends renders chart header', async ({ page }) => {
  await page.context().addCookies([{ name: 'e2e_role', value: 'ADMIN', domain: 'localhost', path: '/' }])
  await page.goto('/admin/stats')
  await expect(page.getByText('Admin • Stats')).toBeVisible()
  await expect(page.getByText('Trends (14 days)')).toBeVisible()
})


