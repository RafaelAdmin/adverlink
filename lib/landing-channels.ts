import { MARKETPLACE_CHANNELS_VIEW } from '@/lib/marketplace-public'
import { getChannelHandle, isChannelVerified } from '@/lib/channel-helpers'
import { formatEngagementRate } from '@/lib/channel-metrics'
import { isPriceListCurrency } from '@/lib/channel-prices'
import { formatPrice as formatMoney } from '@/lib/currency'
import type { CurrencyCode } from '@/lib/currency'

/** Columns safe to request for the public landing carousel. No owner/admin/secrets. */
export const LANDING_CHANNEL_SELECT = [
  'id',
  'name',
  'telegram_username',
  'avatar_url',
  'subscriber_count',
  'avg_views',
  'ad_price',
  'ad_price_currency',
  'is_verified',
  'verification_status',
  'platform',
].join(', ')

export type LandingChannelRow = {
  id: string
  name?: string | null
  telegram_username?: string | null
  avatar_url?: string | null
  subscriber_count?: number | null
  avg_views?: number | null
  ad_price?: number | null
  ad_price_currency?: string | null
  is_verified?: boolean | null
  verification_status?: string | null
  platform?: string | null
}

export type LandingPublicChannel = {
  id: string
  name: string
  handle: string
  platform: string
  avatarUrl: string | null
  subscribers: number
  avgViews: number
  engagementLabel: string | null
  priceLabel: string
  verified: boolean
}

export const LANDING_CHANNELS_VIEW = MARKETPLACE_CHANNELS_VIEW

export function hasLandingChannelName(row: LandingChannelRow): boolean {
  return Boolean(row.name?.trim())
}

export function rankLandingChannels(rows: LandingChannelRow[]): LandingChannelRow[] {
  const scored = rows.filter(hasLandingChannelName).map((row) => {
    const verified = isChannelVerified({
      is_verified: row.is_verified,
      verification_status: row.verification_status,
    })
    const hasAvatar = Boolean(row.avatar_url?.trim())
    const score = (verified ? 4 : 0) + (hasAvatar ? 2 : 0) + (hasLandingChannelName(row) ? 1 : 0)
    return { row, score, verified, hasAvatar }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (b.row.subscriber_count || 0) - (a.row.subscriber_count || 0)
  })

  return scored.map((item) => item.row)
}

export function formatLandingCount(value: number | null | undefined): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(Math.round(n))
}

export function landingPriceLabel(
  amount: number | null | undefined,
  currency: string | null | undefined,
): string {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return 'Цена по запросу'
  const code = (isPriceListCurrency(currency) ? currency : 'USD') as CurrencyCode
  return `от ${formatMoney(n, code)}`
}

/** Public handle only when the listed row actually has one — never fall back to the display name. */
export function landingPublicHandle(row: LandingChannelRow): string {
  const username = row.telegram_username?.trim() || ''
  if (!username) return ''
  const handle = getChannelHandle({
    telegram_username: username,
    name: row.name,
    platform: row.platform,
  })
  const name = row.name?.trim() || ''
  if (!handle || handle === name) return ''
  return handle
}

export function toLandingPublicChannel(row: LandingChannelRow): LandingPublicChannel | null {
  const name = row.name?.trim()
  if (!name || !row.id) return null

  return {
    id: row.id,
    name,
    handle: landingPublicHandle(row),
    platform: row.platform || 'telegram',
    avatarUrl: row.avatar_url?.trim() || null,
    subscribers: Number(row.subscriber_count) || 0,
    avgViews: Number(row.avg_views) || 0,
    engagementLabel: formatEngagementRate(row.subscriber_count, row.avg_views),
    priceLabel: landingPriceLabel(row.ad_price, row.ad_price_currency),
    verified: isChannelVerified({
      is_verified: row.is_verified,
      verification_status: row.verification_status,
    }),
  }
}

export function landingPublicChannelsFromRows(rows: LandingChannelRow[] | null | undefined): LandingPublicChannel[] {
  return rankLandingChannels(rows || [])
    .map(toLandingPublicChannel)
    .filter((item): item is LandingPublicChannel => item !== null)
}
