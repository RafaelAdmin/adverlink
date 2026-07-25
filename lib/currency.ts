export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Доллар' },
  { code: 'EUR', symbol: '€', name: 'Евро' },
  { code: 'AMD', symbol: '֏', name: 'Драм' },
  { code: 'GEL', symbol: '₾', name: 'Лари' },
  { code: 'RUB', symbol: '₽', name: 'Рубль' },
]

export type CurrencyCode = 'USD' | 'EUR' | 'AMD' | 'GEL' | 'RUB'

// Cache exchange rates
let ratesCache: Record<string, number> | null = null
let ratesCacheTime = 0

export async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now()
  // Cache for 1 hour
  if (ratesCache && now - ratesCacheTime < 3600000) {
    return ratesCache
  }

  try {
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD'
    )
    const data = await response.json()
    ratesCache = data.rates
    ratesCacheTime = now
    return data.rates
  } catch {
    // Fallback rates if API fails
    return {
      USD: 1,
      EUR: 0.92,
      AMD: 387,
      GEL: 2.71,
      RUB: 89,
    }
  }
}

export async function convertPrice(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> {
  if (fromCurrency === toCurrency) return amount

  const rates = await getExchangeRates()

  // Convert to USD first, then to target currency
  const inUSD = amount / (rates[fromCurrency] || 1)
  const result = inUSD * (rates[toCurrency] || 1)

  return Math.round(result)
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
  if (!rates[fromCurrency] || !rates[toCurrency]) {
    return formatPrice(price, fromCurrency as CurrencyCode)
  }
  const inUSD = price / rates[fromCurrency]
  const converted = Math.round(inUSD * rates[toCurrency])
  return formatPrice(converted, toCurrency)
}

export function toUsdEstimate(amount: number | string | null | undefined) {
  const value = Number(amount) || 0
  return Math.round(value / USD_RATE)
}

