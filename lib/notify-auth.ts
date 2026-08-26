export const NOTIFY_TYPES = [
  'new_ad_request',
  'deal_accepted',
  'deal_completed',
  'application_rejected',
] as const

export type NotifyType = (typeof NOTIFY_TYPES)[number]

export function isKnownNotifyType(type: string): type is NotifyType {
  return (NOTIFY_TYPES as readonly string[]).includes(type)
}

export interface NotifyDealContext {
  id: string
  channel_id: string
  advertiser_id: string | null
  status: string
  channel_owner_id: string
}

export function validateNotifyAuthorization(
  type: NotifyType,
  userId: string,
  deal: NotifyDealContext,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true

  switch (type) {
    case 'new_ad_request':
      return (
        deal.advertiser_id === userId &&
        (deal.status === 'new' || deal.status === 'payment_pending')
      )
    case 'deal_accepted':
      return deal.channel_owner_id === userId && deal.status === 'accepted'
    case 'deal_completed':
      return deal.advertiser_id === userId && deal.status === 'completed'
    case 'application_rejected':
      return deal.advertiser_id === userId && deal.status === 'rejected'
    default:
      return false
  }
}

export function checkRateLimit(
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= max) {
    return false
  }

  entry.count += 1
  return true
}
