import { formatAmdWithUsd, formatPrice, getCurrencySymbol } from '@/lib/currency'
import type { CurrencyCode } from '@/lib/database.types'
import { isPriceListCurrency } from '@/lib/channel-prices'

export const AD_REQUEST_MAX_QUANTITY = 99
export const AD_REQUEST_MAX_DATES = 14
export const AD_REQUEST_MAX_FILES = 10
export const AD_REQUEST_FILES_BUCKET = 'ad-request-files'

export const AD_REQUEST_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export type AdRequestAllowedMime = (typeof AD_REQUEST_ALLOWED_MIME_TYPES)[number]

const MAX_BYTES_BY_MIME: Record<AdRequestAllowedMime, number> = {
  'image/jpeg': 10 * 1024 * 1024,
  'image/png': 10 * 1024 * 1024,
  'image/gif': 10 * 1024 * 1024,
  'image/webp': 10 * 1024 * 1024,
  'video/mp4': 50 * 1024 * 1024,
  'video/webm': 50 * 1024 * 1024,
  'video/quicktime': 50 * 1024 * 1024,
  'application/pdf': 15 * 1024 * 1024,
  'application/msword': 15 * 1024 * 1024,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 15 * 1024 * 1024,
}

const EXT_BY_MIME: Record<AdRequestAllowedMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

export type CatalogPriceItem = {
  id: string
  channel_id: string
  type: string
  description: string | null
  price: number
  currency: string
  sort_order: number
}

export type SelectedPriceInput = {
  id: string
  quantity: number
  price?: number
  currency?: string
}

export type OrderSnapshotLine = {
  channel_price_id: string
  type: string
  description: string | null
  unit_price: number
  currency: CurrencyCode
  quantity: number
  subtotal: number
  sort_order: number
}

export type MarketplaceOrderQuote =
  | { mode: 'custom'; lines: []; total: null; currency: null }
  | { mode: 'price_list'; lines: OrderSnapshotLine[]; total: number; currency: CurrencyCode }

export function canCreateMarketplaceOrder(userId: string, channelOwnerId: string | null): boolean {
  return Boolean(userId) && Boolean(channelOwnerId) && userId !== channelOwnerId
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function isAllowedAdRequestMime(value: string): value is AdRequestAllowedMime {
  return (AD_REQUEST_ALLOWED_MIME_TYPES as readonly string[]).includes(value)
}

export function extensionForAdRequestMime(mime: string): string | null {
  if (!isAllowedAdRequestMime(mime)) return null
  return EXT_BY_MIME[mime]
}

export function maxBytesForAdRequestMime(mime: string): number | null {
  if (!isAllowedAdRequestMime(mime)) return null
  return MAX_BYTES_BY_MIME[mime]
}

export function validateAdRequestFileMeta(file: {
  type: string
  size: number
  name?: string
}): { error: string } | { mime: AdRequestAllowedMime; size: number } {
  if (!isAllowedAdRequestMime(file.type)) {
    return { error: 'File type is not allowed' }
  }
  const maxBytes = MAX_BYTES_BY_MIME[file.type]
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > maxBytes) {
    return { error: 'File is too large' }
  }
  return { mime: file.type, size: file.size }
}

export function parsePreferredDates(raw: unknown, todayIso?: string): { dates: string[] } | { error: string } {
  if (raw == null) return { dates: [] }
  if (!Array.isArray(raw)) return { error: 'Preferred dates must be an array' }

  const today = todayIso || new Date().toISOString().slice(0, 10)
  const seen = new Set<string>()
  const dates: string[] = []

  for (const value of raw) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { error: 'Preferred dates must use YYYY-MM-DD' }
    }
    if (value < today) return { error: 'Preferred dates cannot be in the past' }
    if (seen.has(value)) continue
    seen.add(value)
    dates.push(value)
  }

  dates.sort()
  if (dates.length > AD_REQUEST_MAX_DATES) {
    return { error: 'Too many preferred dates' }
  }
  return { dates }
}

function catalogForChannel(catalog: CatalogPriceItem[], channelId: string): CatalogPriceItem[] {
  return catalog.filter((item) => item.channel_id === channelId)
}

export function quoteMarketplaceAdRequest(input: {
  channelId: string
  catalog: CatalogPriceItem[]
  selections: SelectedPriceInput[]
}): { quote: MarketplaceOrderQuote } | { error: string } {
  const channelCatalog = catalogForChannel(input.catalog, input.channelId)

  if (!Array.isArray(input.selections)) {
    return { error: 'Price selections must be an array' }
  }

  if (channelCatalog.length === 0) {
    if (input.selections.length > 0) {
      return { error: 'Selected services do not belong to this channel' }
    }
    return { quote: { mode: 'custom', lines: [], total: null, currency: null } }
  }

  if (input.selections.length === 0) {
    return { error: 'Select at least one service from the price list' }
  }

  const byId = new Map(channelCatalog.map((item) => [item.id, item]))
  const seen = new Set<string>()
  const lines: OrderSnapshotLine[] = []

  for (const selection of input.selections) {
    if (!selection?.id || seen.has(selection.id)) {
      return { error: 'Each service can be selected only once' }
    }
    seen.add(selection.id)

    const item = byId.get(selection.id)
    if (!item) {
      return { error: 'Selected services do not belong to this channel' }
    }

    const quantity = Number(selection.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > AD_REQUEST_MAX_QUANTITY) {
      return { error: 'Quantity must be an integer from 1 to 99' }
    }

    if (!isPriceListCurrency(item.currency)) {
      return { error: 'Unsupported price list currency' }
    }

    const unitPrice = roundMoney(Number(item.price))
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return { error: 'Price list item is invalid' }
    }

    lines.push({
      channel_price_id: item.id,
      type: item.type,
      description: item.description,
      unit_price: unitPrice,
      currency: item.currency,
      quantity,
      subtotal: roundMoney(unitPrice * quantity),
      sort_order: item.sort_order,
    })
  }

  const currency = lines[0].currency
  if (lines.some((line) => line.currency !== currency)) {
    return { error: 'Price list must use a single currency' }
  }

  lines.sort((a, b) => a.sort_order - b.sort_order)
  const total = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0))

  return {
    quote: {
      mode: 'price_list',
      lines,
      total,
      currency,
    },
  }
}

export function formatMarketplaceOrderTotal(request: {
  pricing_mode?: string | null
  budget?: number | string | null
  budget_currency?: string | null
}): string {
  if (request.pricing_mode === 'custom') {
    return 'Согласуется с владельцем'
  }
  if (request.pricing_mode === 'price_list') {
    if (request.budget == null || Number(request.budget) <= 0) {
      return 'Согласуется с владельцем'
    }
    const currency = isPriceListCurrency(request.budget_currency) ? request.budget_currency : 'USD'
    return formatPrice(Number(request.budget), currency)
  }
  return formatAmdWithUsd(request.budget)
}

export function formatSnapshotLine(line: Pick<OrderSnapshotLine, 'type' | 'quantity' | 'unit_price' | 'subtotal' | 'currency'>): {
  title: string
  unit: string
  subtotal: string
} {
  const symbol = getCurrencySymbol(line.currency)
  return {
    title: `${line.type} × ${line.quantity}`,
    unit: `${symbol}${line.unit_price.toLocaleString('ru-RU')}`,
    subtotal: formatPrice(line.subtotal, line.currency),
  }
}
