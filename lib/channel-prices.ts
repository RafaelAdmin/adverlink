import type { CurrencyCode } from '@/lib/database.types'
import { getCurrencySymbol } from '@/lib/currency'

export const PRICE_LIST_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'AMD', 'GEL', 'RUB']

export function isPriceListCurrency(value: string | null | undefined): value is CurrencyCode {
  return PRICE_LIST_CURRENCIES.includes((value || '') as CurrencyCode)
}

export type ChannelPriceRow = {
  id: string
  channel_id: string
  type: string
  description: string | null
  price: number
  currency: string
  sort_order: number
}

export type DraftChannelPrice = {
  clientId: string
  type: string
  description: string
  price: string
  currency: CurrencyCode
}

export type SanitizedChannelPrice = {
  type: string
  description: string | null
  price: number
  currency: CurrencyCode
  sort_order: number
}

let draftSeq = 0

export function withPriceListCurrency(
  drafts: DraftChannelPrice[],
  currency: CurrencyCode,
): DraftChannelPrice[] {
  return drafts.map((draft) => ({ ...draft, currency }))
}

export function createEmptyPriceDraft(currency: CurrencyCode = 'USD'): DraftChannelPrice {
  draftSeq += 1
  return {
    clientId: `price-${Date.now()}-${draftSeq}`,
    type: '',
    description: '',
    price: '',
    currency,
  }
}

export function draftsFromPriceRows(rows: ChannelPriceRow[]): DraftChannelPrice[] {
  const drafts = [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      clientId: row.id,
      type: row.type || '',
      description: row.description || '',
      price: row.price != null ? String(row.price) : '',
      currency: (isPriceListCurrency(row.currency) ? row.currency : 'USD') as CurrencyCode,
    }))
  if (drafts.length === 0) return drafts
  return withPriceListCurrency(drafts, drafts[0].currency)
}

export function sanitizeDraftPrices(drafts: DraftChannelPrice[]): SanitizedChannelPrice[] {
  const kept = drafts
    .map((draft, index) => {
      const type = draft.type.trim().slice(0, 120)
      const description = draft.description.trim().slice(0, 500)
      const price = Number(draft.price)
      return { draft, type, description, price, index }
    })
    .filter((item) => item.type.length > 0 && Number.isFinite(item.price) && item.price > 0)

  if (kept.length === 0) return []

  const currency = isPriceListCurrency(kept[0].draft.currency) ? kept[0].draft.currency : 'USD'

  return kept.map((item, sortOrder) => ({
    type: item.type,
    description: item.description || null,
    price: Math.round(item.price * 100) / 100,
    currency,
    sort_order: sortOrder,
  }))
}

export function priceListCurrencyOrError(
  items: Array<{ currency: string }>,
): { currency: CurrencyCode } | { error: string } {
  if (items.length === 0) return { currency: 'USD' }
  const currency = items[0].currency
  if (!isPriceListCurrency(currency)) {
    return { error: 'Unsupported price list currency' }
  }
  if (items.some((item) => item.currency !== currency)) {
    return { error: 'Price list must use a single currency' }
  }
  return { currency }
}

export function deriveChannelStartingPrice(
  items: SanitizedChannelPrice[],
  fallbackCurrency: CurrencyCode = 'USD',
): {
  ad_price: number | null
  ad_price_currency: CurrencyCode
} {
  if (items.length === 0) {
    return { ad_price: null, ad_price_currency: fallbackCurrency }
  }

  const currencyResult = priceListCurrencyOrError(items)
  if ('error' in currencyResult) {
    throw new Error(currencyResult.error)
  }

  const cheapest = items.reduce((min, item) => (item.price < min.price ? item : min))
  return {
    ad_price: cheapest.price,
    ad_price_currency: currencyResult.currency,
  }
}

export function moveDraftPrice(
  drafts: DraftChannelPrice[],
  index: number,
  direction: -1 | 1,
): DraftChannelPrice[] {
  const next = index + direction
  if (index < 0 || next < 0 || index >= drafts.length || next >= drafts.length) {
    return drafts
  }
  const copy = [...drafts]
  const [item] = copy.splice(index, 1)
  copy.splice(next, 0, item)
  return copy
}

export async function replaceChannelPrices(
  supabase: any,
  channelId: string,
  items: SanitizedChannelPrice[],
): Promise<{ error: string | null }> {
  if (items.length > 0) {
    const currencyResult = priceListCurrencyOrError(items)
    if ('error' in currencyResult) {
      return { error: currencyResult.error }
    }
  }

  const { error } = await supabase.rpc('replace_channel_prices', {
    p_channel_id: channelId,
    p_items: items,
  })
  return { error: error?.message ?? null }
}

export function formatPriceListLine(item: {
  type: string
  price: number
  currency?: string | null
}): string {
  const symbol = getCurrencySymbol((item.currency || 'USD') as CurrencyCode)
  const amount = Number.isFinite(item.price) ? item.price.toLocaleString('ru-RU') : '0'
  return `${item.type} — ${symbol}${amount}`
}
