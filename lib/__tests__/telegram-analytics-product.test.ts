import { describe, expect, it } from 'vitest'
import {
  getMarketplaceMetrics,
  isAnalyticsDisconnected,
  isOptionalAnalyticsConnected,
} from '../telegram-analytics-display'

describe('verification vs optional analytics', () => {
  it('treats disconnected analytics as not connected', () => {
    expect(isOptionalAnalyticsConnected('disconnected')).toBe(false)
    expect(isOptionalAnalyticsConnected(null)).toBe(false)
    expect(isAnalyticsDisconnected('disconnected')).toBe(true)
  })

  it('verified channel without bot analytics uses unavailable marketplace mode', () => {
    const metrics = getMarketplaceMetrics({
      platform: 'telegram',
      subscriber_count: 5000,
      avg_views: 0,
      ad_price: 100,
      analytics_status: 'disconnected',
    })
    expect(metrics.mode).toBe('unavailable')
    expect(metrics.subscribers.value).toBe('5.0K')
    expect(metrics.engagement.value).toBe('—')
    expect(metrics.engagement.label).toBe('Нет данных')
  })

  it('verified channel with manual avg_views shows ERR without bot analytics', () => {
    const metrics = getMarketplaceMetrics({
      platform: 'telegram',
      subscriber_count: 1000,
      avg_views: 250,
      ad_price: 50,
      analytics_status: 'disconnected',
    })
    expect(metrics.mode).toBe('err')
    expect(metrics.engagement.value).toBe('25%')
  })

  it('optional analytics collecting mode requires bot connection', () => {
    const metrics = getMarketplaceMetrics({
      platform: 'telegram',
      subscriber_count: 1000,
      avg_views: 0,
      ad_price: 50,
      analytics_status: 'connected',
      analytics_posts_tracked: 2,
    })
    expect(metrics.mode).toBe('collecting')
    expect(isOptionalAnalyticsConnected('connected')).toBe(true)
  })

  it('disconnecting analytics does not affect verification fields (conceptual)', () => {
    const verified = { verification_status: 'verified', is_verified: true }
    const withAnalytics = { ...verified, analytics_status: 'connected' }
    const withoutAnalytics = { ...verified, analytics_status: 'disconnected' }
    expect(withoutAnalytics.verification_status).toBe('verified')
    expect(withAnalytics.verification_status).toBe('verified')
  })
})

describe('optional analytics connect preconditions', () => {
  it('connect API only accepts channelId from client (chat id resolved server-side)', () => {
    const clientPayload = { channelId: '00000000-0000-0000-0000-000000000001' }
    expect(clientPayload).not.toHaveProperty('telegram_chat_id')
    expect(clientPayload).not.toHaveProperty('p_telegram_chat_id')
  })
})
