import { test, expect } from '@playwright/test'

test.describe('API security smoke tests', () => {
  test('POST /api/auth/resend-confirmation rejects invalid email', async ({ request }) => {
    const response = await request.post('/api/auth/resend-confirmation', {
      data: { email: 'not-an-email' },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.ok).toBe(false)
  })

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

  test('GET /api/social-verification/tiktok/start without auth redirects to login', async ({ request }) => {
    const response = await request.get('/api/social-verification/tiktok/start?channelId=00000000-0000-0000-0000-000000000000', {
      maxRedirects: 0,
    })
    expect([302, 307, 308]).toContain(response.status())
    const location = response.headers()['location'] || ''
    expect(location).toMatch(/auth\/login/)
  })

  test('GET /api/social-verification/instagram/callback without session redirects to login', async ({ request }) => {
    const response = await request.get('/api/social-verification/instagram/callback?code=test&state=test', {
      maxRedirects: 0,
    })
    expect([302, 307, 308]).toContain(response.status())
    const location = response.headers()['location'] || ''
    expect(location).toMatch(/auth\/login/)
  })

  test('GET /api/channel-stats without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/channel-stats?channelId=00000000-0000-0000-0000-000000000000')
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/advertiser-report without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/advertiser-report')
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
