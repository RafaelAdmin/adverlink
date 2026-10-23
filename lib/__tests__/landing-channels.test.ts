import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CHANNEL_SECRET_COLUMNS } from '../marketplace-public'
import {
  LANDING_CHANNEL_SELECT,
  formatLandingCount,
  landingPriceLabel,
  landingPublicChannelsFromRows,
  rankLandingChannels,
  toLandingPublicChannel,
  type LandingChannelRow,
} from '../landing-channels'

function row(overrides: Partial<LandingChannelRow> = {}): LandingChannelRow {
  return {
    id: 'ch-1',
    name: 'IT-clopedia',
    telegram_username: 'it_clopedia',
    avatar_url: 'https://example.com/a.png',
    subscriber_count: 1200,
    avg_views: 400,
    ad_price: 15,
    ad_price_currency: 'USD',
    is_verified: true,
    verification_status: 'verified',
    platform: 'telegram',
    ...overrides,
  }
}

describe('landing public channel mapping', () => {
  it('selects only listed public columns and never secret ones', () => {
    for (const column of CHANNEL_SECRET_COLUMNS) {
      expect(LANDING_CHANNEL_SELECT).not.toContain(column)
    }
    expect(LANDING_CHANNEL_SELECT).not.toContain('owner_id')
    expect(LANDING_CHANNEL_SELECT).not.toContain('owner_profile')
    expect(LANDING_CHANNEL_SELECT).not.toContain('is_admin')
    expect(LANDING_CHANNEL_SELECT).toContain('name')
    expect(LANDING_CHANNEL_SELECT).toContain('avatar_url')
    expect(LANDING_CHANNEL_SELECT).toContain('ad_price')
  })

  it('maps a listed channel without leaking owner or secret fields', () => {
    const mapped = toLandingPublicChannel(row())
    expect(mapped).toMatchObject({
      name: 'IT-clopedia',
      handle: '@it_clopedia',
      platform: 'telegram',
      verified: true,
      priceLabel: 'от $15',
    })
    expect(mapped && 'owner_id' in mapped).toBe(false)
    expect(mapped && 'verification_code' in mapped).toBe(false)
    expect(JSON.stringify(mapped)).not.toContain('admin')
  })

  it('does not invent a handle from the channel name', () => {
    expect(toLandingPublicChannel(row({ telegram_username: null }))?.handle).toBe('')
    expect(
      toLandingPublicChannel(
        row({
          name: 'My YouTube',
          telegram_username: 'https://youtube.com/channel/UC123',
          platform: 'youtube',
        }),
      )?.handle,
    ).toBe('')
  })

  it('ranks verified named channels with avatars first and drops nameless rows', () => {
    const ranked = rankLandingChannels([
      row({ id: 'plain', name: 'Plain', is_verified: false, verification_status: 'pending', avatar_url: null }),
      row({ id: 'empty', name: '   ' }),
      row({ id: 'best', name: 'Best', is_verified: true, avatar_url: 'https://cdn/x.png', subscriber_count: 10 }),
    ])
    expect(ranked.map((item) => item.id)).toEqual(['best', 'plain'])
  })

  it('does not invent subscriber counts or prices', () => {
    expect(formatLandingCount(0)).toBe('—')
    expect(formatLandingCount(243)).toBe('243')
    expect(landingPriceLabel(null, 'USD')).toBe('Цена по запросу')
    expect(landingPublicChannelsFromRows([row({ subscriber_count: 0, avg_views: 0, ad_price: null })])[0]).toMatchObject({
      subscribers: 0,
      avgViews: 0,
      engagementLabel: null,
      priceLabel: 'Цена по запросу',
    })
  })
})

describe('landing page copy stays honest', () => {
  const page = readFileSync(resolve(process.cwd(), 'app/page.tsx'), 'utf8')
  const carousel = readFileSync(resolve(process.cwd(), 'app/HeroChannelCarousel.tsx'), 'utf8')

  it('uses the new hero badge and does not put it under the navbar logo', () => {
    expect(page).toContain('landing-badge">🇦🇲 Маркетплейс цифровой рекламы в Армении')
    expect(page).toContain('Реклама в социальных сетях — проще и прозрачнее')
    const navbar = page.slice(page.indexOf('function LandingNavbar'), page.indexOf('const advertiserSteps'))
    expect(navbar).not.toContain('Маркетплейс цифровой рекламы в Армении')
  })

  it('does not claim live escrow or bank payouts in FAQ', () => {
    expect(page).toContain('Банковский escrow и автоматические выплаты на этом этапе не запущены')
    expect(page).toContain('оплату подписки сейчас оформить нельзя')
    expect(page).not.toMatch(/MOCK_CHANNELS/)
  })

  it('loads listed channels from marketplace_channels and sends CTA to login', () => {
    expect(carousel).toContain('LANDING_CHANNELS_VIEW')
    expect(readFileSync(resolve(process.cwd(), 'lib/landing-channels.ts'), 'utf8')).toContain(
      'MARKETPLACE_CHANNELS_VIEW',
    )
    expect(carousel).toContain("href=\"/auth/login\"")
    expect(carousel).not.toContain('/dashboard/channel/')
    expect(carousel).not.toContain('MOCK_CHANNELS')
    expect(carousel).toContain('Каталог каналов пока наполняется')
  })
})
