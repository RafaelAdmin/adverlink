import { test, expect } from '@playwright/test'

test.describe('Telegram analytics API smoke', () => {
  test('webhook rejects requests without secret', async ({ request }) => {
    const response = await request.post('/api/telegram/webhook', {
      data: { update_id: 1 },
    })
    expect([401, 503]).toContain(response.status())
  })

  test('analytics connect requires auth', async ({ request }) => {
    const response = await request.post('/api/telegram/analytics/connect', {
      data: { channelId: '00000000-0000-0000-0000-000000000000' },
    })
    expect(response.status()).toBe(401)
  })

  test('telegram analytics cron fails closed without auth', async ({ request }) => {
    const response = await request.get('/api/cron/telegram-analytics')
    expect([401, 503]).toContain(response.status())
  })

  test('associate-post requires auth', async ({ request }) => {
    const response = await request.post('/api/telegram/analytics/associate-post', {
      data: { dealId: 'x', postUrl: 'https://t.me/test/1' },
    })
    expect(response.status()).toBe(401)
  })
})
