import { test, expect } from '@playwright/test'

test.describe('API security smoke tests', () => {
  test('POST /api/subscribe without auth returns 401', async ({ request }) => {
    const response = await request.post('/api/subscribe', {
      data: { plan: 'pro' },
    })
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/telegram/verify returns 405', async ({ request }) => {
    const response = await request.get('/api/telegram/verify')
    expect(response.status()).toBe(405)
    const body = await response.json()
    expect(body.error).toMatch(/POST/i)
  })

  test('POST /api/telegram/verify without auth returns 401', async ({ request }) => {
    const response = await request.post('/api/telegram/verify', {
      data: { channelId: '00000000-0000-0000-0000-000000000000', code: 'TEST' },
    })
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/auto-complete without cron secret is rejected', async ({ request }) => {
    const response = await request.get('/api/auto-complete')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    } else {
      // Fail-closed when CRON_SECRET is not configured (local dev without secret).
      expect(response.status()).toBe(503)
      const body = await response.json()
      expect(body.error).toMatch(/not configured/i)
    }
  })
})
