import { test, expect } from '@playwright/test'

test.describe('Search API', () => {
  test('returns results for query', async ({ request }) => {
    // Seed a message via direct API call chain could be complex; here we just hit search to ensure 200
    const res = await request.get('/api/search?q=hello')
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json).toHaveProperty('results')
    expect(Array.isArray(json.results)).toBeTruthy()
  })
})


