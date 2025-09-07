import { test, expect } from '@playwright/test'

function mockUploadAndStream() {
  return (
    function () {
      const originalFetch = window.fetch
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url
        if (url.includes('/api/uploads/image') && (init?.method === 'POST')) {
          const body = JSON.stringify({ url: '/uploads/mock.png', type: 'image/png', size: 123 })
          return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'application/json' } }))
        }
        if (url.includes('/api/chats/') && url.includes('/messages') && (init?.method === 'POST')) {
          const encoder = new TextEncoder()
          const body = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('รับรูปแล้ว'))
              controller.close()
            }
          })
          return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
        }
        return originalFetch(input, init)
      }
    } as any
  )
}

// 1x1 PNG buffer for setInputFiles
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9U2p0V8AAAAASUVORK5CYII='

test.describe('Image chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockUploadAndStream())
    await page.goto('/chat')
  })

  test('preview shows after upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept="image/png,image/jpeg"]')
    await fileInput.setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from(TINY_PNG_BASE64, 'base64') })
    const thumb = page.locator('img[src="/uploads/mock.png"]')
    await expect(thumb).toBeVisible()
  })

  test('send with image only streams assistant reply', async ({ page }) => {
    const fileInput = page.locator('input[type="file"][accept="image/png,image/jpeg"]')
    await fileInput.setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from(TINY_PNG_BASE64, 'base64') })
    await page.getByRole('button', { name: 'ส่ง' }).click()
    await expect(page.getByText('ผู้ช่วย:')).toBeVisible()
    await expect(page.getByText(/รับรูปแล้ว/)).toBeVisible()
  })
})


