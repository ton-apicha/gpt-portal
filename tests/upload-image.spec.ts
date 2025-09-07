import { test, expect } from '@playwright/test'

// 1x1 PNG (red) tiny image
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9U2p0V8AAAAASUVORK5CYII='

test.describe('Upload image API', () => {
  test('accepts PNG and returns URL', async ({ request }) => {
    const buffer = Buffer.from(TINY_PNG_BASE64, 'base64')
    const res = await request.post('/api/uploads/image', {
      multipart: {
        file: {
          name: 'tiny.png',
          mimeType: 'image/png',
          buffer,
        },
      },
    })
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.url).toMatch(/^\/uploads\/.+\.png$/)
    expect(json.type).toBe('image/png')
    expect(json.size).toBeGreaterThan(0)
  })

  test('rejects unsupported mime type', async ({ request }) => {
    const buffer = Buffer.from('hello world', 'utf-8')
    const res = await request.post('/api/uploads/image', {
      multipart: {
        file: {
          name: 'note.txt',
          mimeType: 'text/plain',
          buffer,
        },
      },
    })
    expect(res.status()).toBe(415)
    const json = await res.json()
    expect(json.error).toContain('ชนิดไฟล์ไม่รองรับ')
  })
})


