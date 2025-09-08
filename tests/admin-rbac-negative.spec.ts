import { test, expect } from '@playwright/test'

test.describe('Admin RBAC negative', () => {
  test('USER cannot access /admin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Forbidden')).toBeVisible()
  })

  test('USER cannot access /admin/stats', async ({ page }) => {
    await page.goto('/admin/stats')
    await expect(page.getByText('Forbidden')).toBeVisible()
  })

  test('USER cannot access /admin/model', async ({ page }) => {
    await page.goto('/admin/model')
    await expect(page.getByText('Forbidden')).toBeVisible()
  })
})


