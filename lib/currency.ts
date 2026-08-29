export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Доллар' },
  { code: 'EUR', symbol: '€', name: 'Евро' },
  { code: 'AMD', symbol: '֏', name: 'Драм' },
  { code: 'GEL', symbol: '₾', name: 'Лари' },
  { code: 'RUB', symbol: '₽', name: 'Рубль' },
]

import type { CurrencyCode } from '@/lib/database.types'

export type { CurrencyCode } from '@/lib/database.types'

export type MoneySource = {
  sourceAmount: number
  sourceCurrency: string
}

export type MoneyDisplayContext = {
  displayCurrency: CurrencyCode
  rates: Record<string, number>
}

/** Convert stored amount to viewer currency. Returns null if rates unavailable. */
export function convertMoneyAmount(
  amount: number | null | undefined,
  fromCurrency: string | null | undefined,
  toCurrency: CurrencyCode,
  rates: Record<string, number>,
): number | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null

  const from = fromCurrency || 'USD'
  if (from === toCurrency) return amount

  const fromRate = rates[from]
  const toRate = rates[toCurrency]
  if (!fromRate || !toRate) return null

  return (amount / fromRate) * toRate
}

export function formatDisplayMoney(
  amount: number | null | undefined,
  fromCurrency: string | null | undefined,
  toCurrency: CurrencyCode,
  rates: Record<string, number>,
  emptyLabel = '—',
): string {
  const converted = convertMoneyAmount(amount, fromCurrency, toCurrency, rates)
  if (converted === null) return emptyLabel
  return formatPrice(Math.round(converted), toCurrency)
}

export function formatDisplayCpmValue(
  cpmValue: number | null,
  displayCurrency: CurrencyCode,
  emptyLabel = '—',
): string {
  if (cpmValue === null || !Number.isFinite(cpmValue)) return emptyLabel
  const symbol = getCurrencySymbol(displayCurrency)
  return `${symbol}${cpmValue.toFixed(2)}`
}

// Cache exchange rates (freshness window applies — no hard-coded production fallback)
export const EXCHANGE_RATES_CACHE_MS = 60 * 60 * 1000

let ratesCache: Record<string, number> | null = null
let ratesCacheTime = 0

export type ExchangeRatesResult = {
  rates: Record<string, number> | null
  source: 'cache' | 'network' | 'unavailable'
}

export function resetExchangeRatesCacheForTests(): void {
  ratesCache = null
  ratesCacheTime = 0
}

export async function fetchExchangeRates(now: number = Date.now()): Promise<ExchangeRatesResult> {
  if (ratesCache && now - ratesCacheTime < EXCHANGE_RATES_CACHE_MS) {
    return { rates: ratesCache, source: 'cache' }
  }

  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    if (!response.ok) {
      return { rates: null, source: 'unavailable' }
    }

    const data = (await response.json()) as { rates?: Record<string, number> }
    if (!data.rates || typeof data.rates !== 'object') {
      return { rates: null, source: 'unavailable' }
    }

    ratesCache = data.rates
    ratesCacheTime = now
    return { rates: ratesCache, source: 'network' }
  } catch {
    return { rates: null, source: 'unavailable' }
  }
}

/** Returns rates map or empty object when no trustworthy rate is available. */
export async function getExchangeRates(): Promise<Record<string, number>> {
  const result = await fetchExchangeRates()
  return result.rates ?? {}
}

export async function convertPrice(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number | null> {
  if (fromCurrency === toCurrency) return amount

  const rates = await getExchangeRates()
  const converted = convertMoneyAmount(amount, fromCurrency, toCurrency, rates)
  if (converted === null) return null
  return Math.round(converted)
}

export function formatPrice(amount: number, currency: CurrencyCode): string {
  const curr = CURRENCIES.find(c => c.code === currency)
  const symbol = curr?.symbol || currency

  if (currency === 'AMD') {
    return `${amount.toLocaleString()} ${symbol}`
  }
  if (currency === 'RUB') {
    return `${amount.toLocaleString()} ${symbol}`
  }
  return `${symbol}${amount.toLocaleString()}`
}

export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCIES.find(c => c.code === code)?.symbol || code
}

const USD_RATE = 385

export function formatAmd(amount: number | string | null | undefined) {
  const value = Number(amount) || 0
  return `${value.toLocaleString('ru-RU')} AMD`
}

export function formatAmdWithUsd(amount: number | string | null | undefined) {
  const value = Number(amount) || 0
  if (value <= 0) return '0 AMD'
  const usd = Math.round(value / USD_RATE)
  return `${value.toLocaleString('ru-RU')} AMD ≈ $${usd}`
}

export function formatConvertedPrice(
  price: number,
  fromCurrency: string,
  toCurrency: CurrencyCode,
  rates: Record<string, number>,
  emptyLabel = '—',
): string {
  if (!price) return emptyLabel
  return formatDisplayMoney(price, fromCurrency, toCurrency, rates, emptyLabel)
}

export function toUsdEstimate(amount: number | string | null | undefined) {
  const value = Number(amount) || 0
  return Math.round(value / USD_RATE)
}

