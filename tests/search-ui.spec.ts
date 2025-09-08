import { test, expect } from '@playwright/test'

function mockSearch() {
  return (
    function () {
      const originalFetch = window.fetch
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url
        if (typeof url === 'string' && url.startsWith('/api/search')) {
          const body = JSON.stringify({ results: [ { messageId: 'm1', chatId: 'c1', snippet: 'สรุปประชุม…' } ] })
          return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'application/json' } }))
        }
        return originalFetch(input as any, init)
      }
    } as any
  )
}

test('search dropdown shows results', async ({ page }) => {
  await page.addInitScript(mockSearch())
  await page.goto('/chat')
  const input = page.getByPlaceholder('ค้นหาประวัติ...')
  await input.click()
  await input.fill('ประชุม')
  const item = page.getByText('สรุปประชุม…')
  await expect(item).toBeVisible()
})


