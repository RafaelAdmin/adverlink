import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  replaceChannelPrices,
  replaceYoutubeChannelPrices,
  YOUTUBE_PRICE_LIST_REQUIRED_ERROR,
} from '../channel-prices'

const youtubeSql = readFileSync(resolve(process.cwd(), 'supabase/youtube-channel-prices.sql'), 'utf8')
const sharedPricesSql = readFileSync(resolve(process.cwd(), 'supabase/channel-prices.sql'), 'utf8')
const addChannelPage = readFileSync(
  resolve(process.cwd(), 'app/dashboard/add-channel/page.tsx'),
  'utf8',
)
const editChannelPage = readFileSync(
  resolve(process.cwd(), 'app/dashboard/edit-channel/[id]/page.tsx'),
  'utf8',
)
const verifyChannelPage = readFileSync(
  resolve(process.cwd(), 'app/dashboard/verify-channel/[id]/page.tsx'),
  'utf8',
)
const channelPricesClient = readFileSync(resolve(process.cwd(), 'lib/channel-prices.ts'), 'utf8')

describe('youtube-channel-prices.sql', () => {
  it('does not redefine the shared Telegram RPC replace_channel_prices', () => {
    expect(youtubeSql).not.toMatch(
      /create\s+or\s+replace\s+function\s+public\.replace_channel_prices\s*\(/i,
    )
    expect(youtubeSql).not.toMatch(
      /create\s+or\s+replace\s+function\s+public\.verify_channel_after_check\s*\(/i,
    )
    expect(sharedPricesSql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.replace_channel_prices\s*\(/i,
    )
  })

  it('adds a YouTube-only RPC and YouTube-only DB guards', () => {
    expect(youtubeSql).toMatch(/NOT auto-applied/)
    expect(youtubeSql).toContain('replace_youtube_channel_prices')
    expect(youtubeSql).toContain("c.platform = 'youtube'")
    expect(youtubeSql).toContain('YouTube channels require at least one valid price list item')
    expect(youtubeSql).toContain('YouTube channels require a price list before verification')
    expect(youtubeSql).toContain('enforce_youtube_remaining_prices_trigger')
    expect(youtubeSql).toContain('deferrable initially deferred')
    expect(youtubeSql).not.toMatch(/create table public\.youtube/i)
    expect(youtubeSql).not.toMatch(/drop table public\.channel_prices/i)
    expect(youtubeSql).not.toMatch(/ad_requests/)
  })
})

describe('YouTube UI does not change the Telegram price-list path', () => {
  it('keeps Telegram add/edit on replaceChannelPrices / replace_channel_prices', () => {
    expect(channelPricesClient).toContain("supabase.rpc('replace_channel_prices'")
    expect(addChannelPage).toContain('Пропустить и добавить позже')
    expect(addChannelPage).toMatch(
      /else if \(isTelegram && priceItems\.length > 0\)[\s\S]*replaceChannelPrices\(supabase, newChannel\.id, priceItems\)/,
    )
    expect(editChannelPage).toMatch(
      /else if \(usesPriceList\)[\s\S]*replaceChannelPrices\(supabase, channel\.id, priceItems\)/,
    )
  })

  it('saves YouTube prices only through replaceYoutubeChannelPrices', () => {
    expect(addChannelPage).toMatch(
      /if \(isYouTube\)[\s\S]*replaceYoutubeChannelPrices\(supabase, newChannel\.id, priceItems\)/,
    )
    expect(editChannelPage).toContain('replaceYoutubeChannelPrices(supabase, channel.id, priceItems)')
    expect(verifyChannelPage).toContain(
      'replaceYoutubeChannelPrices(supabase, channel.id, priceItems)',
    )
    expect(verifyChannelPage).not.toContain('replaceChannelPrices')
  })
})

describe('replaceYoutubeChannelPrices client', () => {
  const items = [
    { type: 'Интеграция 60 сек', description: null, price: 150, currency: 'USD' as const, sort_order: 0 },
  ]

  it('calls replace_youtube_channel_prices and never replace_channel_prices', async () => {
    const from = vi.fn()
    const rpc = vi.fn().mockResolvedValue({ error: null })

    const result = await replaceYoutubeChannelPrices({ rpc, from }, 'yt-1', items)

    expect(result).toEqual({ error: null })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('replace_youtube_channel_prices', {
      p_channel_id: 'yt-1',
      p_items: items,
    })
    expect(rpc.mock.calls[0][0]).not.toBe('replace_channel_prices')
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects an empty YouTube list before any RPC', async () => {
    const rpc = vi.fn()
    const result = await replaceYoutubeChannelPrices({ rpc, from: vi.fn() }, 'yt-1', [])
    expect(result).toEqual({ error: YOUTUBE_PRICE_LIST_REQUIRED_ERROR })
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('replaceChannelPrices remains the Telegram/shared client', () => {
  it('still talks only to replace_channel_prices', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    await replaceChannelPrices({ rpc, from: vi.fn() }, 'tg-1', [
      { type: 'Пост', description: null, price: 25, currency: 'USD', sort_order: 0 },
    ])
    expect(rpc).toHaveBeenCalledWith('replace_channel_prices', {
      p_channel_id: 'tg-1',
      p_items: [
        { type: 'Пост', description: null, price: 25, currency: 'USD', sort_order: 0 },
      ],
    })
  })
})
