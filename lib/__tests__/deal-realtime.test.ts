import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AD_REQUESTS_REALTIME_TABLE,
  MY_ORDERS_REALTIME_CHANNEL,
  adRequestIdRealtimeFilter,
  dealRowRealtimeChannelName,
  isDealRealtimeId,
} from '@/lib/deal-realtime'

describe('deal realtime helpers', () => {
  it('scopes the deal channel and filter to one order id', () => {
    const dealId = '11111111-2222-3333-4444-555555555555'
    expect(dealRowRealtimeChannelName(dealId)).toBe(`deal-row-${dealId}`)
    expect(adRequestIdRealtimeFilter(dealId)).toBe(`id=eq.${dealId}`)
    expect(AD_REQUESTS_REALTIME_TABLE).toBe('ad_requests')
    expect(MY_ORDERS_REALTIME_CHANNEL).toBe('my-orders-ad-requests')
    expect(isDealRealtimeId(dealId)).toBe(true)
    expect(isDealRealtimeId('')).toBe(false)
  })
})

describe('deal-realtime-publication.sql', () => {
  const sql = readFileSync(resolve(process.cwd(), 'supabase/deal-realtime-publication.sql'), 'utf8')

  it('adds ad_requests to supabase_realtime without changing RLS', () => {
    expect(sql).toMatch(/alter publication supabase_realtime add table public\.ad_requests/)
    expect(sql).toMatch(/replica identity full/)
    expect(sql).toMatch(/NOT auto-applied/)
    expect(sql).not.toMatch(/drop policy/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})
