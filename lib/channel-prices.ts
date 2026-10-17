import type { CurrencyCode } from '@/lib/database.types'
import { getCurrencySymbol } from '@/lib/currency'

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
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      clientId: row.id,
      type: row.type || '',
      description: row.description || '',
      price: row.price != null ? String(row.price) : '',
      currency: (row.currency || 'USD') as CurrencyCode,
    }))
}

export function sanitizeDraftPrices(drafts: DraftChannelPrice[]): SanitizedChannelPrice[] {
  return drafts
    .map((draft, index) => {
      const type = draft.type.trim().slice(0, 120)
      const description = draft.description.trim().slice(0, 500)
      const price = Number(draft.price)
      return { draft, type, description, price, index }
    })
    .filter((item) => item.type.length > 0 && Number.isFinite(item.price) && item.price > 0)
    .map((item, sortOrder) => ({
      type: item.type,
      description: item.description || null,
      price: Math.round(item.price * 100) / 100,
      currency: item.draft.currency || 'USD',
      sort_order: sortOrder,
    }))
}

export function deriveChannelStartingPrice(items: SanitizedChannelPrice[]): {
  ad_price: number | null
  ad_price_currency: CurrencyCode
} {
  if (items.length === 0) {
    return { ad_price: null, ad_price_currency: 'USD' }
  }

  const cheapest = items.reduce((min, item) => (item.price < min.price ? item : min))
  return {
    ad_price: cheapest.price,
    ad_price_currency: cheapest.currency,
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
  const { error: deleteError } = await supabase.from('channel_prices').delete().eq('channel_id', channelId)
  if (deleteError) return { error: deleteError.message }
  if (items.length === 0) return { error: null }

  const { error: insertError } = await supabase.from('channel_prices').insert(
    items.map((item) => ({
      channel_id: channelId,
      type: item.type,
      description: item.description,
      price: item.price,
      currency: item.currency,
      sort_order: item.sort_order,
    })),
  )
  if (insertError) return { error: insertError.message }
  return { error: null }
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
