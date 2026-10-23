import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('youtube-channel-prices.sql', () => {
  const sql = readFileSync(resolve(process.cwd(), 'supabase/youtube-channel-prices.sql'), 'utf8')

  it('gates YouTube on existing channel_prices without a separate table or Telegram/payment changes', () => {
    expect(sql).toMatch(/NOT auto-applied/)
    expect(sql).toContain('youtube_channel_has_price_list')
    expect(sql).toContain("platform = 'youtube'")
    expect(sql).toContain('YouTube channels require at least one valid price list item')
    expect(sql).toContain('YouTube channels require a price list before verification')
    expect(sql).toContain('replace_channel_prices')
    expect(sql).toContain('verify_channel_after_check')
    expect(sql).toContain('enforce_youtube_remaining_prices_trigger')
    expect(sql).toContain('deferrable initially deferred')
    expect(sql).not.toMatch(/create table public\.youtube/i)
    expect(sql).not.toMatch(/drop table public\.channel_prices/i)
    expect(sql).not.toMatch(/ad_requests/)
    expect(sql).not.toMatch(/from public\.telegram/i)
  })
})
