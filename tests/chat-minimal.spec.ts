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
              const chunks = ['โอ', 'เ', 'ค']
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

test.describe('Chat minimal flow', () => {
  test('send message inside chat page and see reply', async ({ page }) => {
    await page.addInitScript(mockStreamReply())
    await page.goto('/chat')
    // create new chat first from header
    await page.getByRole('button', { name: 'New Chat' }).click()
    await expect(page).toHaveURL(/\/chat\//)

    const main = page.locator('main').first()
    const textarea = page.getByPlaceholder('พิมพ์ข้อความ...')
    await textarea.fill('ทดสอบ')
    await page.getByRole('button', { name: 'ส่ง' }).click()

    await expect(main.getByText('ทดสอบ')).toBeVisible()
    await expect(main.getByText('โอเค')).toBeVisible({ timeout: 5000 })
  })

  test('copy icon copies assistant reply and shows feedback', async ({ page }) => {
    await page.addInitScript(mockStreamReply())
    await page.goto('/chat')
    await page.getByRole('button', { name: 'New Chat' }).click()
    await expect(page).toHaveURL(/\/chat\//)

    const textarea = page.getByPlaceholder('พิมพ์ข้อความ...')
    await textarea.fill('ขอคำตอบ')
    await page.getByRole('button', { name: 'ส่ง' }).click()

    const copyBtn = page.getByTestId('copy-reply')
    await expect(copyBtn).toBeVisible({ timeout: 5000 })
    await copyBtn.click()
    await expect(page.getByTestId('copied-indicator')).toBeVisible()
  })

  test('long conversation is scrollable', async ({ page }) => {
    // seed 80 messages
    const user = await prisma.user.upsert({ where: { email: 'e2e@example.com' }, update: {}, create: { email: 'e2e@example.com', passwordHash: 'x', role: 'USER' } })
    const chat = await prisma.chat.create({ data: { userId: user.id, title: 'Long Chat' } })
    const rows = Array.from({ length: 80 }, (_, i) => ({ chatId: chat.id, role: i % 2 === 0 ? 'user' : 'assistant', content: `msg-${i + 1}`, createdAt: new Date(Date.now() + i * 1000) }))
    await prisma.message.createMany({ data: rows })

    await page.goto(`/chat/${chat.id}`)
    const main = page.locator('main').first()

    // Scroll to top, expect first message visible
    await main.evaluate((el) => { el.scrollTop = 0 })
    await expect(main.getByText(/^msg-1$/)).toBeVisible()

    // Scroll to bottom, expect last message visible
    await main.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await expect(main.getByText(/^msg-80$/)).toBeVisible()
  })
})
