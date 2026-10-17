import { describe, expect, it } from 'vitest'
import {
  createEmptyPriceDraft,
  deriveChannelStartingPrice,
  draftsFromPriceRows,
  formatPriceListLine,
  moveDraftPrice,
  sanitizeDraftPrices,
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

  it('returns null price when the list is empty', () => {
    expect(deriveChannelStartingPrice([])).toEqual({ ad_price: null, ad_price_currency: 'USD' })
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

  it('maps stored rows back into drafts', () => {
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
        price: 25,
        currency: 'USD',
        sort_order: 0,
      },
    ])
    expect(drafts.map((item) => item.type)).toEqual(['Пост 24 часа в ленте', 'Сторис 24 часа'])
  })

  it('formats a UI example line', () => {
    expect(formatPriceListLine({ type: 'Пост 24 часа в ленте', price: 25, currency: 'USD' })).toBe(
      'Пост 24 часа в ленте — $25',
    )
  })
})
