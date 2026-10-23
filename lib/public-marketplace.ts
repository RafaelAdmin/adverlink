import { isChannelVerified } from '@/lib/channel-helpers'
import { formatEngagementRate } from '@/lib/channel-metrics'
import { convertMoneyAmount, type CurrencyCode } from '@/lib/currency'
import { isPriceListCurrency } from '@/lib/channel-prices'
import { sanitizeAuthNextPath } from '@/lib/auth-urls'
import {
  formatLandingCount,
  landingPriceLabel,
  landingPublicHandle,
  type LandingChannelRow,
} from '@/lib/landing-channels'
import { MARKETPLACE_CHANNELS_VIEW } from '@/lib/marketplace-public'

/** Explicit public columns. Never select('*') and never read public.channels. */
export const PUBLIC_CHANNEL_SELECT = [
  'id',
  'category_id',
  'name',
  'telegram_username',
  'description',
  'avatar_url',
  'subscriber_count',
  'avg_views',
  'engagement_rate',
  'language',
  'country',
  'ad_price',
  'ad_price_currency',
  'is_verified',
  'verification_status',
  'platform',
  'platform_url',
  'rating',
].join(', ')

export const PUBLIC_CATEGORY_SELECT = 'id, name, icon'

export const PUBLIC_CHANNELS_VIEW = MARKETPLACE_CHANNELS_VIEW

export const PUBLIC_SUBS_MAX = 1_000_000
export const PUBLIC_PRICE_MAX = 10_000

const CHANNEL_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type PublicCategory = {
  id: string
  name: string
  icon: string | null
}

export type PublicChannelRow = {
  id?: string | null
  category_id?: string | null
  name?: string | null
  telegram_username?: string | null
  description?: string | null
  avatar_url?: string | null
  subscriber_count?: number | null
  avg_views?: number | null
  engagement_rate?: number | null
  language?: string | null
  country?: string | null
  ad_price?: number | null
  ad_price_currency?: string | null
  is_verified?: boolean | null
  verification_status?: string | null
  platform?: string | null
  platform_url?: string | null
  rating?: number | null
}

export type PublicChannel = {
  id: string
  categoryId: string | null
  categoryName: string | null
  name: string
  handle: string
  description: string
  avatarUrl: string | null
  subscribers: number
  subscriberLabel: string
  avgViews: number
  viewsLabel: string
  engagementLabel: string | null
  priceLabel: string
  adPrice: number | null
  adPriceCurrency: string
  verified: boolean
  platform: string
  platformUrl: string | null
  country: string | null
  language: string | null
  ratingLabel: string | null
}

export type PublicChannelFilterState = {
  search: string
  platform: string
  categoryId: string
  minSubs: number
  maxSubs: number
  minPrice: number
  maxPrice: number
}

export const DEFAULT_PUBLIC_FILTERS: PublicChannelFilterState = {
  search: '',
  platform: 'all',
  categoryId: 'all',
  minSubs: 0,
  maxSubs: PUBLIC_SUBS_MAX,
  minPrice: 0,
  maxPrice: PUBLIC_PRICE_MAX,
}

export function isPublicChannelId(id: string | null | undefined): id is string {
  return Boolean(id && CHANNEL_ID_RE.test(id))
}

export function publicChannelPath(id: string): string | null {
  if (!isPublicChannelId(id)) return null
  return `/marketplace/channel/${id}`
}

export function requestAdPath(id: string): string | null {
  if (!isPublicChannelId(id)) return null
  return `/dashboard/add-channel/request-ad?channelId=${id}`
}

/** Login/signup return path. Open redirects fall back to the dashboard. */
export function loginHrefForPath(next: string): string {
  const safe = sanitizeAuthNextPath(next)
  return `/auth/login?next=${encodeURIComponent(safe)}`
}

export function requestAdHref(channelId: string, authenticated: boolean): string | null {
  const next = requestAdPath(channelId)
  if (!next) return null
  return authenticated ? next : loginHrefForPath(next)
}

export function safePublicUrl(value: string | null | undefined): string | null {
  const raw = value?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

function engagementLabel(row: PublicChannelRow): string | null {
  const stored = Number(row.engagement_rate)
  if (Number.isFinite(stored) && stored > 0) {
    const rounded = Math.round(stored * 10) / 10
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`
  }
  return formatEngagementRate(row.subscriber_count, row.avg_views)
}

function ratingLabel(value: number | null | undefined): string | null {
  const rating = Number(value)
  if (!Number.isFinite(rating) || rating <= 0) return null
  return rating.toFixed(1)
}

export function toPublicChannel(
  row: PublicChannelRow,
  categoryName: string | null = null,
): PublicChannel | null {
  const name = row.name?.trim()
  if (!name || !isPublicChannelId(row.id)) return null

  const currency = isPriceListCurrency(row.ad_price_currency) ? row.ad_price_currency : 'USD'
  const price = Number(row.ad_price)
  const adPrice = Number.isFinite(price) && price > 0 ? price : null
  const subscribers = Number(row.subscriber_count) || 0
  const avgViews = Number(row.avg_views) || 0
  const landingRow: LandingChannelRow = {
    id: row.id,
    name,
    telegram_username: row.telegram_username,
    platform: row.platform,
  }

  return {
    id: row.id,
    categoryId: row.category_id || null,
    categoryName,
    name,
    handle: landingPublicHandle(landingRow),
    description: row.description?.trim() || '',
    avatarUrl: row.avatar_url?.trim() || null,
    subscribers,
    subscriberLabel: formatLandingCount(subscribers),
    avgViews,
    viewsLabel: formatLandingCount(avgViews),
    engagementLabel: engagementLabel(row),
    priceLabel: landingPriceLabel(adPrice, currency),
    adPrice,
    adPriceCurrency: currency,
    verified: isChannelVerified({
      is_verified: row.is_verified,
      verification_status: row.verification_status,
    }),
    platform: row.platform || 'telegram',
    platformUrl: safePublicUrl(row.platform_url),
    country: row.country?.trim() || null,
    language: row.language?.trim() || null,
    ratingLabel: ratingLabel(row.rating),
  }
}

export function mapPublicChannels(
  rows: PublicChannelRow[] | null | undefined,
  categories: PublicCategory[] = [],
): PublicChannel[] {
  const names = new Map(categories.map((category) => [category.id, category.name]))
  return (rows || [])
    .map((row) => toPublicChannel(row, row.category_id ? names.get(row.category_id) || null : null))
    .filter((item): item is PublicChannel => item !== null)
    .sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1
      return b.subscribers - a.subscribers
    })
}

function priceUsd(channel: PublicChannel, rates: Record<string, number>): number | null {
  if (channel.adPrice == null) return null
  const converted = convertMoneyAmount(
    channel.adPrice,
    channel.adPriceCurrency,
    'USD' as CurrencyCode,
    { USD: 1, ...rates },
  )
  return converted == null ? null : Math.round(converted)
}

export function filterPublicChannels(
  channels: PublicChannel[],
  filters: PublicChannelFilterState,
  rates: Record<string, number> = {},
): PublicChannel[] {
  const query = filters.search.trim().toLowerCase()
  const priceNarrowed = filters.minPrice > 0 || filters.maxPrice < PUBLIC_PRICE_MAX
  const subsMin = Math.min(filters.minSubs, filters.maxSubs)
  const subsMax = Math.max(filters.minSubs, filters.maxSubs)
  const priceMin = Math.min(filters.minPrice, filters.maxPrice)
  const priceMax = Math.max(filters.minPrice, filters.maxPrice)

  return channels.filter((channel) => {
    const haystack = `${channel.name} ${channel.description}`.toLowerCase()
    const matchSearch = !query || haystack.includes(query)
    const matchPlatform = filters.platform === 'all' || channel.platform === filters.platform
    const matchCategory = filters.categoryId === 'all' || channel.categoryId === filters.categoryId
    const matchSubs = channel.subscribers >= subsMin && channel.subscribers <= subsMax
    const usd = priceUsd(channel, rates)
    const matchPrice =
      usd == null ? !priceNarrowed : usd >= priceMin && usd <= priceMax
    return matchSearch && matchPlatform && matchCategory && matchSubs && matchPrice
  })
}

export const PUBLIC_PLATFORM_OPTIONS = [
  { value: 'all', label: 'Все платформы' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
] as const

const LANGUAGE_LABELS: Record<string, string> = {
  ru: 'Русский',
  hy: 'Армянский',
  en: 'English',
  uk: 'Українська',
}

const COUNTRY_LABELS: Record<string, string> = {
  AM: 'Армения',
  RU: 'Россия',
  GE: 'Грузия',
  KZ: 'Казахстан',
  UA: 'Украина',
}

export function publicLanguageLabel(code: string | null): string | null {
  if (!code) return null
  return LANGUAGE_LABELS[code] || null
}

export function publicCountryLabel(code: string | null): string | null {
  if (!code) return null
  return COUNTRY_LABELS[code] || null
}
