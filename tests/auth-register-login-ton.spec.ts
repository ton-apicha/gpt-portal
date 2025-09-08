import { test, expect } from '@playwright/test'
import { prisma } from '@/lib/prisma'

function mockStreamReply() {
  return (
    function () {
      const originalFetch = window.fetch
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        if (typeof url === 'string' && url.includes('/api/chats/') && url.includes('/messages') && (init?.method === 'POST')) {
          const encoder = new TextEncoder()
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              const chunks = ['ยินดี', 'ต้อนรับ', 'ครับ']
              let i = 0
              function push(){
                if (i < chunks.length) {
                  controller.enqueue(encoder.encode(chunks[i++]))
                  setTimeout(push, 15)
                } else {
                  controller.close()
                }
              }
              push()
            }
          })
          return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
        }
        return originalFetch(input as any, init)
      }
    } as any
  )
}

test('register, login with ton@mail.com and start chatting', async ({ page }) => {
  const email = 'ton@mail.com'
  const password = 'pass1234'

  // Ensure clean state
  await prisma.user.deleteMany({ where: { email } })

  // Register via API
  const reg = await page.request.post('/api/register', { data: { email, password, name: 'Ton' } })
  expect(reg.ok()).toBeTruthy()

  // Login via UI
  await page.goto('/login')
  await page.fill('input[placeholder="อีเมล"]', email)
  await page.fill('input[placeholder="รหัสผ่าน"]', password)
  await page.click('button:has-text("เข้าสู่ระบบ")')
  await page.waitForURL(/^(?!.*\/login).*$/)

  // Start a chat and send a message (mock stream for determinism)
  await page.addInitScript(mockStreamReply())
  await page.goto('/chat')
  await expect(page).toHaveURL(/\/chat\//)

  const main = page.locator('main').first()
  const textarea = page.getByPlaceholder('พิมพ์ข้อความ...')
  await textarea.fill('สวัสดีจาก Ton')
  await page.getByRole('button', { name: 'ส่ง' }).click()

  await expect(main.getByText('สวัสดีจาก Ton')).toBeVisible()
  await expect(main.getByText('ยินดีต้อนรับครับ')).toBeVisible({ timeout: 5000 })
})


