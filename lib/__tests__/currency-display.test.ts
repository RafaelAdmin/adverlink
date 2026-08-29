import { describe, expect, it } from 'vitest'
import { convertMoneyAmount, formatDisplayCpmValue, formatDisplayMoney } from '@/lib/currency'
import {
  formatCpm24Display,
  formatCpmDisplay,
  getMarketplaceMetrics,
} from '@/lib/telegram-analytics-display'

const rates = {
  USD: 1,
  EUR: 0.92,
  AMD: 387,
  GEL: 2.71,
  RUB: 89,
}

const displayUsd = { displayCurrency: 'USD' as const, rates }
const displayEur = { displayCurrency: 'EUR' as const, rates }

describe('convertMoneyAmount', () => {
  it('converts 40000 AMD to USD display amount', () => {
    const converted = convertMoneyAmount(40000, 'AMD', 'USD', rates)
    expect(converted).not.toBeNull()
    expect(Math.round(converted!)).toBe(103)
  })

  it('converts 40000 AMD to EUR display amount', () => {
    const converted = convertMoneyAmount(40000, 'AMD', 'EUR', rates)
    expect(converted).not.toBeNull()
    expect(Math.round(converted!)).toBe(95)
  })

  it('converts 100 USD to AMD display amount', () => {
    const converted = convertMoneyAmount(100, 'USD', 'AMD', rates)
    expect(converted).not.toBeNull()
    expect(Math.round(converted!)).toBe(38700)
  })

  it('returns same amount when source and target currency match', () => {
    expect(convertMoneyAmount(40000, 'AMD', 'AMD', rates)).toBe(40000)
    expect(convertMoneyAmount(100, 'USD', 'USD', rates)).toBe(100)
  })

  it('returns null for missing exchange rate instead of fake conversion', () => {
    expect(convertMoneyAmount(100, 'XXX', 'USD', rates)).toBeNull()
    expect(convertMoneyAmount(100, 'USD', 'XXX' as 'USD', rates)).toBeNull()
  })

  it('returns null for null or zero amounts', () => {
    expect(convertMoneyAmount(null, 'USD', 'USD', rates)).toBeNull()
    expect(convertMoneyAmount(0, 'USD', 'USD', rates)).toBeNull()
  })
})

describe('formatDisplayMoney', () => {
  it('formats converted AMD price for USD viewer', () => {
    expect(formatDisplayMoney(40000, 'AMD', 'USD', rates)).toBe('$103')
  })

  it('returns — when conversion unavailable', () => {
    expect(formatDisplayMoney(40000, 'AMD', 'USD', {})).toBe('—')
    expect(formatDisplayMoney(null, 'USD', 'USD', rates)).toBe('—')
  })
})

describe('CPM uses converted ad price in viewer currency', () => {
  it('computes CPM from converted price, not source currency amount', () => {
    const cpm = formatCpmDisplay(40000, 10000, displayUsd, 'AMD')
    expect(cpm).toBe('$10.34')
  })

  it('computes CPM24 from converted price', () => {
    const result = formatCpm24Display(40000, 5000, 2, displayUsd, 'AMD')
    expect(result.value).toBe('$20.67')
    expect(result.hint).toBeNull()
  })

  it('does not double-convert when source already matches display currency', () => {
    expect(formatCpmDisplay(100, 10000, displayUsd, 'USD')).toBe('$10.00')
  })
})

describe('Marketplace metrics use viewer preferred currency', () => {
  it('shows CPM24 in USD for AMD-priced channel', () => {
    const metrics = getMarketplaceMetrics(
      {
        subscriber_count: 1000,
        avg_views: 8000,
        ad_price: 40000,
        ad_price_currency: 'AMD',
        analytics_avg_views_24h: 5000,
        analytics_err24_eligible_count: 1,
      },
      displayUsd,
    )
    expect(metrics.price.metricLabel).toBe('CPM24')
    expect(metrics.price.value).toBe('$20.67')
  })

  it('shows CPM fallback in EUR for AMD-priced channel', () => {
    const metrics = getMarketplaceMetrics(
      {
        subscriber_count: 1000,
        avg_views: 10000,
        ad_price: 40000,
        ad_price_currency: 'AMD',
        analytics_err24_eligible_count: 0,
      },
      displayEur,
    )
    expect(metrics.price.metricLabel).toBe('CPM')
    expect(metrics.price.value).toMatch(/^€/)
  })
})

describe('formatDisplayMoney with unavailable rates', () => {
  it('returns — when rates map is empty', () => {
    expect(formatDisplayMoney(40000, 'AMD', 'USD', {})).toBe('—')
  })
})

describe('formatDisplayCpmValue', () => {
  it('returns — for null CPM values', () => {
    expect(formatDisplayCpmValue(null, 'USD')).toBe('—')
  })
})
