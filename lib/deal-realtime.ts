export const MY_ORDERS_REALTIME_CHANNEL = 'my-orders-ad-requests'
export const DEAL_ROW_REALTIME_CHANNEL_PREFIX = 'deal-row-'
export const AD_REQUESTS_REALTIME_TABLE = 'ad_requests'
export const DEAL_REALTIME_DEBOUNCE_MS = 200

export function dealRowRealtimeChannelName(dealId: string): string {
  return `${DEAL_ROW_REALTIME_CHANNEL_PREFIX}${dealId}`
}

export function adRequestIdRealtimeFilter(dealId: string): string {
  return `id=eq.${dealId}`
}

export function isDealRealtimeId(dealId: string | null | undefined): dealId is string {
  return typeof dealId === 'string' && dealId.length > 0
}
