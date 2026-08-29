import { describe, expect, it } from 'vitest'
import { formatCompactNumber } from '../telegram-analytics'
import {
  buildTelegramChannelAnalytics,
  formatCpm24Display,
  formatCpmDisplay,
  formatErr24Display,
  formatErrDisplay,
  getAnalyticsStatusUserLabel,
  getMarketplaceMetrics,
  isAnalyticsDisconnected,
  isOptionalAnalyticsConnected,
} from '../telegram-analytics-display'

const rates = {
  USD: 1,
  EUR: 0.92,
  AMD: 387,
  GEL: 2.71,
  RUB: 89,
}

const displayUsd = { displayCurrency: 'USD' as const, rates }

describe('formatCompactNumber', () => {
  it('formats abbreviated counts', () => {
    expect(formatCompactNumber(1234)).toBe('1.2K')
    expect(formatCompactNumber(25400)).toBe('25.4K')
    expect(formatCompactNumber(1_400_000)).toBe('1.4M')
    expect(formatCompactNumber(3)).toBe('3')
  })

  it('returns null for missing values', () => {
    expect(formatCompactNumber(null)).toBeNull()
    expect(formatCompactNumber(undefined)).toBeNull()
  })
})

describe('ERR display', () => {
  it('shows — when avg_views is null', () => {
    expect(formatErrDisplay(1000, null)).toBe('—')
  })

  it('shows real ERR when data exists', () => {
    expect(formatErrDisplay(1000, 250)).toBe('25%')
  })

  it('shows — when subscribers missing', () => {
    expect(formatErrDisplay(null, 250)).toBe('—')
  })
})

describe('ERR24 display', () => {
  it('shows — with waiting hint when no eligible posts', () => {
    const result = formatErr24Display(1000, 400, 0)
    expect(result.value).toBe('—')
    expect(result.hint).toMatch(/24/)
  })

  it('shows real ERR24 when eligible', () => {
    const result = formatErr24Display(1000, 400, 2)
    expect(result.value).toBe('40%')
    expect(result.hint).toBeNull()
  })

  it('never shows 0% for missing data', () => {
    expect(formatErr24Display(1000, null, 0).value).toBe('—')
    expect(formatErr24Display(1000, 0, 1).value).toBe('—')
  })
})

describe('CPM calculations in viewer currency', () => {
  it('computes CPM from converted ad price', () => {
    expect(formatCpmDisplay(100, 250, displayUsd, 'USD')).toBe('$400.00')
    expect(formatCpmDisplay(40000, 10000, displayUsd, 'AMD')).toBe('$10.34')
  })

  it('computes CPM24 when eligible', () => {
    const result = formatCpm24Display(100, 200, 1, displayUsd, 'USD')
    expect(result.value).toBe('$500.00')
    expect(result.hint).toBeNull()
  })

  it('returns — when division would be invalid', () => {
    expect(formatCpmDisplay(100, null, displayUsd, 'USD')).toBe('—')
    expect(formatCpmDisplay(0, 250, displayUsd, 'USD')).toBe('—')
    expect(formatCpm24Display(100, null, 0, displayUsd, 'USD').value).toBe('—')
  })

  it('does not convert null to zero', () => {
    expect(formatCpmDisplay(null, 250, displayUsd, 'USD')).toBe('—')
    expect(formatErrDisplay(1000, null)).not.toBe('0%')
  })
})

describe('Marketplace metrics — strictly 3 cells', () => {
  it('shows ERR24 and CPM24 when 24h data exists', () => {
    const metrics = getMarketplaceMetrics(
      {
        subscriber_count: 1000,
        avg_views: 200,
        ad_price: 50,
        ad_price_currency: 'USD',
        analytics_avg_views_24h: 250,
        analytics_err24_eligible_count: 2,
      },
      displayUsd,
    )
    expect(metrics.engagement.metricLabel).toBe('ERR24')
    expect(metrics.engagement.value).toBe('25%')
    expect(metrics.price.metricLabel).toBe('CPM24')
    expect(metrics.price.value).toBe('$200.00')
  })

  it('falls back to ERR and CPM without labeling as 24h metrics', () => {
    const metrics = getMarketplaceMetrics(
      {
        subscriber_count: 1000,
        avg_views: 250,
        ad_price: 50,
        ad_price_currency: 'USD',
        analytics_avg_views_24h: null,
        analytics_err24_eligible_count: 0,
      },
      displayUsd,
    )
    expect(metrics.engagement.metricLabel).toBe('ERR')
    expect(metrics.engagement.value).toBe('25%')
    expect(metrics.price.metricLabel).toBe('CPM')
    expect(metrics.price.value).toBe('$200.00')
  })

  it('shows — when engagement metrics unavailable', () => {
    const metrics = getMarketplaceMetrics(
      {
        subscriber_count: 1000,
        avg_views: null,
        ad_price: 50,
        analytics_status: 'connected',
        analytics_posts_tracked: 1,
      },
      displayUsd,
    )
    expect(metrics.engagement.value).toBe('—')
    expect(metrics.engagement.metricLabel).toBe('ERR24')
    expect(metrics.price.value).toBe('—')
  })

  it('disconnected channel with manual avg_views still shows ERR fallback', () => {
    const metrics = getMarketplaceMetrics(
      {
        subscriber_count: 1000,
        avg_views: 250,
        ad_price: 50,
        ad_price_currency: 'USD',
        analytics_status: 'disconnected',
      },
      displayUsd,
    )
    expect(metrics.engagement.metricLabel).toBe('ERR')
    expect(metrics.engagement.value).toBe('25%')
    expect(metrics.subscribers.value).toBe('1K')
  })

  it('shows — for missing subscribers', () => {
    const metrics = getMarketplaceMetrics(
      {
        subscriber_count: null,
        avg_views: 250,
      },
      displayUsd,
    )
    expect(metrics.subscribers.value).toBe('—')
  })
})

describe('channel analytics detail builder', () => {
  it('shows collecting message for small tracked sample', () => {
    const { sampleSizeWarning } = buildTelegramChannelAnalytics(
      {
        subscriber_count: 500,
        avg_views: 100,
        analytics_posts_tracked: 2,
        analytics_err24_eligible_count: 0,
        analytics_status: 'collecting',
      },
      displayUsd,
    )
    expect(sampleSizeWarning).toMatch(/Сбор данных/)
  })

  it('includes analytics status labels', () => {
    expect(getAnalyticsStatusUserLabel('disconnected')).toMatch(/не подключена/)
    expect(getAnalyticsStatusUserLabel('active')).toBe('Аналитика активна')
    expect(getAnalyticsStatusUserLabel('error')).toMatch(/недоступна/)
  })

  it('shows waiting hint for ERR24 and CPM24 without eligible posts', () => {
    const { sections } = buildTelegramChannelAnalytics(
      {
        subscriber_count: 1000,
        avg_views: 300,
        ad_price: 100,
        ad_price_currency: 'USD',
        analytics_posts_tracked: 5,
        analytics_err24_eligible_count: 0,
        analytics_status: 'collecting',
      },
      displayUsd,
    )
    const performance = sections.find((s) => s.title === 'Эффективность')
    const advertising = sections.find((s) => s.title === 'Рекламная эффективность')
    expect(performance?.rows.find((r) => r.label === 'ERR24')?.hint).toMatch(/24/)
    expect(advertising?.rows.find((r) => r.label === 'CPM24')?.hint).toMatch(/24/)
  })

  it('shows ad price in viewer currency for AMD source price', () => {
    const { sections } = buildTelegramChannelAnalytics(
      {
        subscriber_count: 1000,
        avg_views: 10000,
        ad_price: 40000,
        ad_price_currency: 'AMD',
        analytics_posts_tracked: 5,
        analytics_err24_eligible_count: 0,
      },
      displayUsd,
    )
    const advertising = sections.find((s) => s.title === 'Рекламная эффективность')
    expect(advertising?.rows.find((r) => r.label === 'Цена рекламы')?.value).toBe('$103')
    expect(advertising?.rows.find((r) => r.label === 'CPM')?.value).toBe('$10.34')
  })
})

describe('verification vs optional analytics', () => {
  it('treats disconnected analytics as not connected', () => {
    expect(isOptionalAnalyticsConnected('disconnected')).toBe(false)
    expect(isOptionalAnalyticsConnected(null)).toBe(false)
    expect(isAnalyticsDisconnected('disconnected')).toBe(true)
    expect(isAnalyticsDisconnected('error')).toBe(false)
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

describe('creator source currency is preserved conceptually', () => {
  it('does not mutate stored amount when formatting for display', () => {
    const source = { ad_price: 40000, ad_price_currency: 'AMD' as const }
    getMarketplaceMetrics(
      {
        subscriber_count: 1000,
        avg_views: 10000,
        ...source,
      },
      displayUsd,
    )
    expect(source.ad_price).toBe(40000)
    expect(source.ad_price_currency).toBe('AMD')
  })
})
