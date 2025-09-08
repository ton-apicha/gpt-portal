import { test, expect } from '@playwright/test'

test('admin can download CSV export', async ({ page, request }) => {
  await page.context().addCookies([{ name: 'e2e_role', value: 'ADMIN', domain: 'localhost', path: '/' }])
  await page.goto('/admin/stats')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = await download.path()
  expect(download.suggestedFilename()).toContain('metrics')
  expect(path).toBeTruthy()
})


