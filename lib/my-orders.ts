import { formatMarketplaceOrderTotal } from '@/lib/ad-request-order'
import { formatPrice } from '@/lib/currency'
import { isPriceListCurrency } from '@/lib/channel-prices'
import type { CurrencyCode } from '@/lib/database.types'

export const MY_ORDERS_PATH = '/dashboard/orders'
export const MY_ORDERS_LABEL = 'Мои заказы'

export const LEGACY_MY_REQUESTS_PATHS = [
  '/dashboard/requests',
  '/dashboard/my-requests',
] as const

export const FORBIDDEN_ORDER_NAV_TERMS = [
  'Мои запросы',
  'входящие заказы',
  'исходящие заказы',
  'Входящие запросы',
] as const

export type OrderSpace = 'creator' | 'advertiser'

export type OrderAccessContext = {
  userId: string
  isAdmin?: boolean
  ownedChannelIds: string[]
}

export type OrderListRecord = {
  id: string
  channel_id: string | null
  advertiser_id: string | null
  advertiser_name?: string | null
  pricing_mode?: string | null
  budget?: number | string | null
  budget_currency?: string | null
  status: string
  campaign_id?: string | null
  creator_viewed_at?: string | null
  advertiser_viewed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  creator_note?: string | null
  dispute_reason?: string | null
  ad_request_price_snapshots?: Array<{
    type?: string | null
    quantity?: number | null
    sort_order?: number | null
    unit_price?: number | null
    currency?: string | null
  }> | null
  ad_request_preferred_dates?: Array<{ preferred_on?: string | null }> | null
  channels?: { id?: string; name?: string | null; owner_id?: string | null } | null
}

const EPOCH = '1970-01-01T00:00:00.000Z'

export function isUnviewedTimestamp(
  viewedAt: string | null | undefined,
  activityAt: string | null | undefined,
): boolean {
  if (!viewedAt) return true
  return (activityAt || EPOCH) > viewedAt
}

export function canViewOrderInSpace(
  space: OrderSpace,
  order: Pick<OrderListRecord, 'advertiser_id' | 'channel_id'>,
  ctx: OrderAccessContext,
): boolean {
  if (ctx.isAdmin) return true
  if (space === 'creator') {
    return Boolean(order.channel_id && ctx.ownedChannelIds.includes(order.channel_id))
  }
  return order.advertiser_id === ctx.userId
}

export function canOpenOrderPage(
  order: Pick<OrderListRecord, 'advertiser_id' | 'channel_id'> & {
    channels?: { owner_id?: string | null } | null
    channel_owner_id?: string | null
  },
  ctx: OrderAccessContext,
): boolean {
  if (ctx.isAdmin) return true
  const ownerId = order.channel_owner_id ?? order.channels?.owner_id ?? null
  if (ownerId && ownerId === ctx.userId) return true
  if (order.advertiser_id === ctx.userId) return true
  if (order.channel_id && ctx.ownedChannelIds.includes(order.channel_id)) return true
  return false
}

export function filterOrdersForSpace(
  space: OrderSpace,
  orders: OrderListRecord[],
  ctx: OrderAccessContext,
): OrderListRecord[] {
  return orders.filter((order) => canViewOrderInSpace(space, order, ctx))
}

export function formatOrderServicesLabel(
  space: OrderSpace,
  order: Pick<OrderListRecord, 'pricing_mode' | 'ad_request_price_snapshots'>,
): string {
  const lines = [...(order.ad_request_price_snapshots || [])].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
  )
  if (lines.length > 0) {
    return lines
      .map((line) => `${line.type || 'Услуга'} × ${line.quantity || 1}`)
      .join(', ')
  }
  if (space === 'creator') return 'Цена согласуется'
  return 'Согласуется с владельцем'
}

export function formatOrderAmountLabel(
  space: OrderSpace,
  order: Pick<OrderListRecord, 'pricing_mode' | 'budget' | 'budget_currency' | 'ad_request_price_snapshots'>,
): string | null {
  if (order.pricing_mode === 'custom') {
    return space === 'creator' ? 'Цена согласуется' : 'Согласуется с владельцем'
  }
  if (order.pricing_mode === 'price_list') {
    return formatMarketplaceOrderTotal(order)
  }
  if (order.budget != null && Number(order.budget) > 0) {
    const currency = isPriceListCurrency(order.budget_currency)
      ? (order.budget_currency as CurrencyCode)
      : null
    if (currency) return formatPrice(Number(order.budget), currency)
    return formatMarketplaceOrderTotal(order)
  }
  return space === 'creator' ? 'Цена согласуется' : 'Согласуется с владельцем'
}

export function formatPreferredDatesLabel(
  dates: Array<{ preferred_on?: string | null }> | null | undefined,
): string {
  const values = (dates || [])
    .map((row) => row.preferred_on)
    .filter((value): value is string => Boolean(value))
    .sort()
  if (values.length === 0) return 'Не указаны'
  return values.map((value) => new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU')).join(', ')
}

export function orderRejectionReason(
  order: Pick<OrderListRecord, 'status' | 'creator_note' | 'dispute_reason'>,
): string | null {
  const status = order.status
  if (status !== 'rejected' && status !== 'cancelled') return null
  const reason = (order.creator_note || order.dispute_reason || '').trim()
  return reason || null
}

export function hasCreatorOrderNotice(
  order: Pick<OrderListRecord, 'status' | 'creator_viewed_at' | 'updated_at' | 'created_at'>,
): boolean {
  if (order.status !== 'new' && order.status !== 'payment_pending') return false
  return isUnviewedTimestamp(order.creator_viewed_at, order.updated_at || order.created_at)
}

export function hasAdvertiserOrderNotice(
  order: Pick<
    OrderListRecord,
    'status' | 'campaign_id' | 'advertiser_viewed_at' | 'updated_at' | 'created_at'
  >,
): boolean {
  const unviewed = isUnviewedTimestamp(order.advertiser_viewed_at, order.updated_at || order.created_at)
  if (!unviewed) return false
  if (order.status === 'new') return Boolean(order.campaign_id)
  return ['accepted', 'rejected', 'cancelled', 'submitted', 'in_progress', 'completed'].includes(
    order.status,
  )
}

export function navContainsForbiddenOrderTerm(label: string): boolean {
  const normalized = label.toLowerCase()
  return FORBIDDEN_ORDER_NAV_TERMS.some((term) => normalized.includes(term.toLowerCase()))
}

export function shouldRedirectMarketplaceRequestsTab(tab: string | null): boolean {
  return tab === 'requests' || tab === 'mine' || tab === 'my-requests'
}
