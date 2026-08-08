export const FREE_CHANNEL_LIMIT = 3
export const FREE_CAMPAIGN_LIMIT = 3
export const PRO_PRICE_EUR = 18

export type SubscriptionPlan = 'free' | 'pro'

export function isProPlan(plan: string | null | undefined, isAdmin?: boolean) {
  return plan === 'pro' || isAdmin === true
}

export function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

export function getNextMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0)
}

export function getLimitResetLabel(date = new Date()) {
  const next = getNextMonthStart(date)
  return next.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function formatPeriodLabel(from: Date, to: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  return `${from.toLocaleDateString('ru-RU', opts)} — ${to.toLocaleDateString('ru-RU', opts)}`
}

export function canAddChannel(isPro: boolean, channelCount: number) {
  return isPro || channelCount < FREE_CHANNEL_LIMIT
}

export function canCreateCampaign(isPro: boolean, campaignsThisMonth: number) {
  return isPro || campaignsThisMonth < FREE_CAMPAIGN_LIMIT
}

export function defaultReportRange() {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date()
  from.setDate(from.getDate() - 30)
  from.setHours(0, 0, 0, 0)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

export function parseReportRange(fromStr: string, toStr: string) {
  const from = new Date(fromStr)
  from.setHours(0, 0, 0, 0)
  const to = new Date(toStr)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

export function filterByDateRange<T extends { created_at: string }>(
  items: T[],
  from: Date,
  to: Date,
) {
  return items.filter((item) => {
    const d = new Date(item.created_at)
    return d >= from && d <= to
  })
}
