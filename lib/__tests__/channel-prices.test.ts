import { describe, expect, it, vi } from 'vitest'
import {
  createEmptyPriceDraft,
  deriveChannelStartingPrice,
  draftsFromPriceRows,
  formatPriceListLine,
  moveDraftPrice,
  replaceChannelPrices,
  sanitizeDraftPrices,
  withPriceListCurrency,
} from '../channel-prices'

describe('sanitizeDraftPrices', () => {
  it('keeps named services with numeric prices', () => {
    const items = sanitizeDraftPrices([
      { clientId: '1', type: 'Пост 24 часа в ленте', description: '', price: '25', currency: 'USD' },
      { clientId: '2', type: 'Сторис 24 часа', description: 'Stories', price: '10.5', currency: 'USD' },
    ])
    expect(items).toEqual([
      { type: 'Пост 24 часа в ленте', description: null, price: 25, currency: 'USD', sort_order: 0 },
      { type: 'Сторис 24 часа', description: 'Stories', price: 10.5, currency: 'USD', sort_order: 1 },
    ])
  })

  it('drops empty, zero and non-numeric rows', () => {
    const items = sanitizeDraftPrices([
      { clientId: '1', type: '', description: '', price: '25', currency: 'USD' },
      { clientId: '2', type: 'Пост', description: '', price: '0', currency: 'USD' },
      { clientId: '3', type: 'Пост', description: '', price: 'abc', currency: 'USD' },
    ])
    expect(items).toEqual([])
  })

  it('does not allow mixed currencies in one sanitized price list', () => {
    const items = sanitizeDraftPrices([
      { clientId: '1', type: 'Пост', description: '', price: '10000', currency: 'AMD' },
      { clientId: '2', type: 'Сторис', description: '', price: '10', currency: 'USD' },
    ])
    expect(items.map((item) => item.currency)).toEqual(['AMD', 'AMD'])
  })
})

describe('deriveChannelStartingPrice', () => {
  it('uses the cheapest item for the existing channels.ad_price field', () => {
    expect(
      deriveChannelStartingPrice([
        { type: 'Пост', description: null, price: 25, currency: 'USD', sort_order: 0 },
        { type: 'Сторис', description: null, price: 10, currency: 'USD', sort_order: 1 },
      ]),
    ).toEqual({ ad_price: 10, ad_price_currency: 'USD' })
  })

  it('keeps the min price in the shared list currency', () => {
    expect(
      deriveChannelStartingPrice([
        { type: 'Пост', description: null, price: 40000, currency: 'AMD', sort_order: 0 },
        { type: 'Сторис', description: null, price: 15000, currency: 'AMD', sort_order: 1 },
      ]),
    ).toEqual({ ad_price: 15000, ad_price_currency: 'AMD' })
  })

  it('does not pick a cheaper number from a different currency', () => {
    expect(() =>
      deriveChannelStartingPrice([
        { type: 'Пост', description: null, price: 40000, currency: 'AMD', sort_order: 0 },
        { type: 'Сторис', description: null, price: 10, currency: 'USD', sort_order: 1 },
      ]),
    ).toThrow('Price list must use a single currency')
  })

  it('returns null price when the list is empty', () => {
    expect(deriveChannelStartingPrice([])).toEqual({ ad_price: null, ad_price_currency: 'USD' })
    expect(deriveChannelStartingPrice([], 'AMD')).toEqual({ ad_price: null, ad_price_currency: 'AMD' })
  })
})

describe('replaceChannelPrices', () => {
  const items = [
    { type: 'Пост', description: null, price: 25, currency: 'USD' as const, sort_order: 0 },
  ]

  it('saves through one RPC so a failed insert cannot leave the list deleted', async () => {
    const from = vi.fn()
    const rpc = vi.fn().mockResolvedValue({ error: { message: 'insert failed' } })

    const result = await replaceChannelPrices({ rpc, from }, 'channel-1', items)

    expect(result).toEqual({ error: 'insert failed' })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('replace_channel_prices', {
      p_channel_id: 'channel-1',
      p_items: items,
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('rejects mixed currencies before touching stored rows', async () => {
    const from = vi.fn()
    const rpc = vi.fn()

    const result = await replaceChannelPrices({ rpc, from }, 'channel-1', [
      { type: 'Пост', description: null, price: 40000, currency: 'AMD', sort_order: 0 },
      { type: 'Сторис', description: null, price: 10, currency: 'USD', sort_order: 1 },
    ])

    expect(result).toEqual({ error: 'Price list must use a single currency' })
    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })
})

describe('draft helpers', () => {
  it('creates an empty draft and reorders items', () => {
    const a = createEmptyPriceDraft('USD')
    const b = createEmptyPriceDraft('EUR')
    a.type = 'A'
    b.type = 'B'
    const moved = moveDraftPrice([a, b], 0, 1)
    expect(moved.map((item) => item.type)).toEqual(['B', 'A'])
    expect(moveDraftPrice([a, b], 0, -1)).toEqual([a, b])
  })

  it('applies one currency to every draft in the list', () => {
    const drafts = withPriceListCurrency(
      [createEmptyPriceDraft('USD'), createEmptyPriceDraft('EUR')],
      'AMD',
    )
    expect(drafts.map((item) => item.currency)).toEqual(['AMD', 'AMD'])
  })

  it('maps stored rows back into drafts with a single currency', () => {
    const drafts = draftsFromPriceRows([
      {
        id: 'id-2',
        channel_id: 'c1',
        type: 'Сторис 24 часа',
        description: null,
        price: 10,
        currency: 'USD',
        sort_order: 1,
      },
      {
        id: 'id-1',
        channel_id: 'c1',
        type: 'Пост 24 часа в ленте',
        description: null,
        price: 25000,
        currency: 'AMD',
        sort_order: 0,
      },
    ])
    expect(drafts.map((item) => item.type)).toEqual(['Пост 24 часа в ленте', 'Сторис 24 часа'])
    expect(drafts.map((item) => item.currency)).toEqual(['AMD', 'AMD'])
  })

  it('formats a UI example line', () => {
    expect(formatPriceListLine({ type: 'Пост 24 часа в ленте', price: 25, currency: 'USD' })).toBe(
      'Пост 24 часа в ленте — $25',
    )
  })
})
