import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHANNEL_SECRET_COLUMNS } from '../marketplace-public'
import { LANDING_DEMO_CHANNELS } from '../landing-demo-channels'
import {
  DEFAULT_PUBLIC_FILTERS,
  PUBLIC_CHANNEL_SELECT,
  filterPublicChannels,
  isPublicChannelId,
  loginHrefForPath,
  mapPublicChannels,
  publicChannelPath,
  requestAdHref,
  requestAdPath,
  safePublicUrl,
  toPublicChannel,
  type PublicChannelRow,
} from '../public-marketplace'

const CHANNEL_ID = '11111111-1111-4111-8111-111111111111'

function row(overrides: Partial<PublicChannelRow> = {}): PublicChannelRow {
  return {
    id: CHANNEL_ID,
    category_id: '22222222-2222-4222-8222-222222222222',
    name: 'IT-clopedia',
    telegram_username: 'it_clopedia',
    description: 'Технологии и обзоры',
    avatar_url: 'https://cdn.example/a.png',
    subscriber_count: 12000,
    avg_views: 1800,
    engagement_rate: 15,
    language: 'ru',
    country: 'AM',
    ad_price: 40,
    ad_price_currency: 'USD',
    is_verified: true,
    verification_status: 'verified',
    platform: 'telegram',
    platform_url: 'https://t.me/it_clopedia',
    rating: 4.5,
    ...overrides,
  }
}

describe('public marketplace select', () => {
  it('requests an explicit column list and omits secrets', () => {
    expect(PUBLIC_CHANNEL_SELECT).not.toContain('*')
    for (const column of CHANNEL_SECRET_COLUMNS) {
      expect(PUBLIC_CHANNEL_SELECT.split(', ')).not.toContain(column)
    }
    for (const column of ['owner_id', 'owner_profile', 'email', 'is_admin', 'contact_telegram', 'analytics_status']) {
      expect(PUBLIC_CHANNEL_SELECT.split(', ')).not.toContain(column)
    }
    expect(PUBLIC_CHANNEL_SELECT).toContain('name')
    expect(PUBLIC_CHANNEL_SELECT).toContain('description')
    expect(PUBLIC_CHANNEL_SELECT).toContain('ad_price')
    expect(PUBLIC_CHANNEL_SELECT).toContain('category_id')
  })

  it('maps a listed channel without private fields', () => {
    const mapped = toPublicChannel(row(), 'Технологии')
    expect(mapped).toMatchObject({
      name: 'IT-clopedia',
      handle: '@it_clopedia',
      categoryName: 'Технологии',
      priceLabel: 'от $40',
      engagementLabel: '15%',
      verified: true,
      platformUrl: 'https://t.me/it_clopedia',
    })
    expect(mapped && 'owner_id' in mapped).toBe(false)
    expect(mapped && 'verification_code' in mapped).toBe(false)
    expect(mapped && 'verification_status' in mapped).toBe(false)
    expect(mapped && 'owner_profile' in mapped).toBe(false)
    expect(JSON.stringify(mapped)).not.toContain('is_admin')
  })

  it('drops rows without a public name or a channel id', () => {
    expect(toPublicChannel(row({ name: '  ' }))).toBeNull()
    expect(toPublicChannel(row({ id: 'not-a-uuid' }))).toBeNull()
    expect(mapPublicChannels([row({ name: '' }), row()])).toHaveLength(1)
  })

  it('rejects unsafe platform urls', () => {
    expect(safePublicUrl('javascript:alert(1)')).toBeNull()
    expect(safePublicUrl('https://t.me/example')).toBe('https://t.me/example')
  })
})

describe('public marketplace filters and return paths', () => {
  const channels = mapPublicChannels([
    row(),
    row({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Kitchen',
      description: 'Рецепты',
      platform: 'instagram',
      subscriber_count: 3000,
      ad_price: 15,
      category_id: '44444444-4444-4444-8444-444444444444',
      is_verified: false,
      verification_status: 'pending',
    }),
    row({
      id: '55555555-5555-4555-8555-555555555555',
      name: 'No price',
      description: 'Обзоры',
      ad_price: null,
      subscriber_count: 800,
    }),
  ])

  it('filters by name, description, platform, category, subscribers and price', () => {
    expect(filterPublicChannels(channels, { ...DEFAULT_PUBLIC_FILTERS, search: 'рецепт' }).map((item) => item.name)).toEqual([
      'Kitchen',
    ])
    expect(filterPublicChannels(channels, { ...DEFAULT_PUBLIC_FILTERS, search: 'обзор' }).map((item) => item.name)).toEqual([
      'IT-clopedia',
      'No price',
    ])
    expect(filterPublicChannels(channels, { ...DEFAULT_PUBLIC_FILTERS, platform: 'instagram' })).toHaveLength(1)
    expect(
      filterPublicChannels(channels, {
        ...DEFAULT_PUBLIC_FILTERS,
        categoryId: '22222222-2222-4222-8222-222222222222',
      }).map((item) => item.name),
    ).toEqual(['IT-clopedia', 'No price'])
    expect(filterPublicChannels(channels, { ...DEFAULT_PUBLIC_FILTERS, minSubs: 10000 })).toHaveLength(1)
    expect(filterPublicChannels(channels, { ...DEFAULT_PUBLIC_FILTERS, minPrice: 30, maxPrice: 50 }).map((item) => item.name)).toEqual([
      'IT-clopedia',
    ])
  })

  it('builds an internal return path and rejects open redirects', () => {
    expect(isPublicChannelId(CHANNEL_ID)).toBe(true)
    expect(publicChannelPath(CHANNEL_ID)).toBe(`/marketplace/channel/${CHANNEL_ID}`)
    expect(requestAdPath(CHANNEL_ID)).toBe(`/dashboard/add-channel/request-ad?channelId=${CHANNEL_ID}`)
    expect(requestAdHref(CHANNEL_ID, true)).toBe(requestAdPath(CHANNEL_ID))
    expect(requestAdHref(CHANNEL_ID, false)).toBe(
      `/auth/login?next=${encodeURIComponent(requestAdPath(CHANNEL_ID) || '')}`,
    )
    expect(loginHrefForPath('https://evil.example')).toBe('/auth/login?next=%2Fdashboard')
    expect(loginHrefForPath('//evil.example')).toBe('/auth/login?next=%2Fdashboard')
    expect(requestAdHref('not-an-id', false)).toBeNull()
  })
})

describe('public marketplace sources stay on the view', () => {
  const catalog = readFileSync(resolve(process.cwd(), 'app/marketplace/PublicCatalog.tsx'), 'utf8')
  const detail = readFileSync(resolve(process.cwd(), 'app/marketplace/channel/[id]/PublicChannelView.tsx'), 'utf8')
  const login = readFileSync(resolve(process.cwd(), 'app/auth/login/page.tsx'), 'utf8')

  it('reads marketplace_channels with the explicit select', () => {
    for (const source of [catalog, detail]) {
      expect(source).toContain('PUBLIC_CHANNELS_VIEW')
      expect(source).toContain('PUBLIC_CHANNEL_SELECT')
      expect(source).not.toContain(".from('channels')")
      expect(source).not.toContain('.from("channels")')
      expect(source).not.toContain("select('*')")
      expect(source).not.toContain('select("*")')
      expect(source).not.toContain('owner_profile')
      expect(source).not.toContain('/dashboard/marketplace')
      expect(source).not.toContain('/dashboard/channel/')
    }
  })

  it('returns login and signup to the safe next path', () => {
    expect(login).toContain('sanitizeAuthNextPath(searchParams.get(\'next\'))')
    expect(login).toContain('getClientAuthCallbackUrl(nextPath)')
    expect(login).toContain('router.push(nextPath)')
  })
})

describe('landing hero demo cards', () => {
  it('uses illustrative metrics and does not query the marketplace', () => {
    const carousel = readFileSync(resolve(process.cwd(), 'app/HeroChannelCarousel.tsx'), 'utf8')
    expect(carousel).toContain('LANDING_DEMO_CHANNELS')
    expect(carousel).toContain('href="/marketplace"')
    expect(carousel).not.toContain('LANDING_CHANNELS_VIEW')
    expect(carousel).not.toContain('createClient')
    expect(carousel).not.toContain('marketplace_channels')
    expect(carousel).not.toContain(".from('channels')")

    expect(LANDING_DEMO_CHANNELS.length).toBeGreaterThanOrEqual(4)
    for (const channel of LANDING_DEMO_CHANNELS) {
      expect(channel.subscribers).toBeGreaterThanOrEqual(8000)
      expect(channel.subscribers).toBeLessThanOrEqual(85000)
      expect(channel.avgViews).toBeGreaterThanOrEqual(3000)
      expect(channel.avgViews).toBeLessThanOrEqual(40000)
      const er = Number(channel.engagementLabel?.replace('%', ''))
      expect(er).toBeGreaterThanOrEqual(4)
      expect(er).toBeLessThanOrEqual(18)
      const price = Number(channel.priceLabel.replace(/[^\d]/g, ''))
      expect(price).toBeGreaterThanOrEqual(20)
      expect(price).toBeLessThanOrEqual(250)
    }
  })
})
