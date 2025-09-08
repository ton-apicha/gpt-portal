import { test, expect } from '@playwright/test'
import { prisma } from '@/lib/prisma'

async function seedChatWithMessages(count: number) {
  const user = await prisma.user.upsert({
    where: { email: 'e2e@example.com' },
    update: {},
    create: { email: 'e2e@example.com', passwordHash: 'x', role: 'USER' },
  })
  const chat = await prisma.chat.create({ data: { userId: user.id, title: 'Infinite Chat' } })
  const base = new Date()
  const rows = Array.from({ length: count }, (_, i) => ({
    chatId: chat.id,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `msg-${i + 1}`,
    createdAt: new Date(base.getTime() + i * 1000),
  }))
  await prisma.message.createMany({ data: rows })
  return chat.id
}

test.describe('Chat infinite scrolling', () => {
  test('loads newest 30 and prepends older when scrolled to top', async ({ page }) => {
    const chatId = await seedChatWithMessages(120)
    await page.goto(`/chat/${chatId}`)

    const main = page.locator('main').first()
    const bubbles = main.locator('div.group.relative.flex')
    await expect(bubbles).toHaveCount(30)

    // scroll near top to trigger loading older
    await main.evaluate((el) => { el.scrollTop = 0 })
    await expect(bubbles).toHaveCountGreaterThan(30)

    // ensure we didn't jump to bottom after prepend
    const pos = await main.evaluate((el) => ({ t: el.scrollTop, h: el.scrollHeight, c: el.clientHeight }))
    expect(pos.t + pos.c).toBeLessThan(pos.h - 5)
  })

  test('load multiple pages until endReached and show banner', async ({ page }) => {
    const chatId = await seedChatWithMessages(95)
    await page.goto(`/chat/${chatId}`)
    const main = page.locator('main').first()
    const bubbles = main.locator('div.group.relative.flex')

    // Initially 30
    await expect(bubbles).toHaveCount(30)

    // Load repeatedly until the banner shows
    for (let i = 0; i < 5; i++) {
      await main.evaluate((el) => { el.scrollTop = 0 })
      // let UI update; expect count to increase but cap at total 95
      await page.waitForTimeout(150)
    }

    // Should not exceed total messages
    const total = await bubbles.count()
    expect(total).toBeLessThanOrEqual(95)

    // Banner shown when end reached
    await expect(page.getByText('ถึงข้อความแรกแล้ว')).toBeVisible()
  })

  test('preserves order and no duplicates after multiple prepends', async ({ page }) => {
    const chatId = await seedChatWithMessages(64)
    await page.goto(`/chat/${chatId}`)
    const main = page.locator('main').first()

    // Load twice to bring older pages
    for (let i = 0; i < 3; i++) {
      await main.evaluate((el) => { el.scrollTop = 0 })
      await page.waitForTimeout(120)
    }

    // Read all visible contents
    const texts = await main.locator('div.group.relative.flex').allInnerTexts()
    // Extract msg- numbers, ignore labels "คุณ:"/"ผู้ช่วย:" if present in layout
    const ids = texts
      .map((t) => (t.match(/msg-(\d+)/)?.[1]))
      .filter(Boolean)
      .map((n) => Number(n))

    // No duplicates
    const set = new Set(ids)
    expect(set.size).toBe(ids.length)

    // Ascending order by msg number
    const sorted = [...ids].sort((a, b) => a - b)
    expect(ids).toEqual(sorted)
  })

  test('page scroll (window) remains at top; only main scrolls', async ({ page }) => {
    const chatId = await seedChatWithMessages(10)
    await page.goto(`/chat/${chatId}`)
    const main = page.locator('main').first()
    await main.evaluate((el) => { el.scrollTop = el.scrollHeight })
    const winY = await page.evaluate(() => window.scrollY)
    expect(winY).toBe(0)
  })
})


