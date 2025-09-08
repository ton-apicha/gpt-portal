import { test, expect } from '@playwright/test'

function mockAdminSession() {
  return (
    function () {
      // nothing: we rely on E2E_BYPASS_AUTH=1 and E2E_ROLE=ADMIN on server side
    } as any
  )
}

test.describe('Admin RBAC', () => {
  test('admin page accessible for ADMIN', async ({ page }) => {
    await page.addInitScript(mockAdminSession())
    await page.goto('/admin')
    await expect(page.getByText('Admin • Users')).toBeVisible()
  })
})
