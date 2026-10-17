import { describe, expect, it } from 'vitest'
import {
  canCreateMarketplaceOrder,
  quoteMarketplaceAdRequest,
  validateAdRequestFileMeta,
  parsePreferredDates,
  formatMarketplaceOrderTotal,
} from '../ad-request-order'

const channelId = 'channel-1'

const catalog = [
  {
    id: 'post',
    channel_id: channelId,
    type: 'Пост 24 часа в ленте',
    description: 'Лента',
    price: 25,
    currency: 'USD',
    sort_order: 0,
  },
  {
    id: 'story',
    channel_id: channelId,
    type: 'Сторис 24 часа',
    description: null,
    price: 10,
    currency: 'USD',
    sort_order: 1,
  },
]

describe('quoteMarketplaceAdRequest', () => {
  it('calculates line subtotals and total from catalog prices', () => {
    const result = quoteMarketplaceAdRequest({
      channelId,
      catalog,
      selections: [
        { id: 'story', quantity: 2 },
        { id: 'post', quantity: 1 },
      ],
    })
    expect(result).toEqual({
      quote: {
        mode: 'price_list',
        currency: 'USD',
        total: 45,
        lines: [
          {
            channel_price_id: 'post',
            type: 'Пост 24 часа в ленте',
            description: 'Лента',
            unit_price: 25,
            currency: 'USD',
            quantity: 1,
            subtotal: 25,
            sort_order: 0,
          },
          {
            channel_price_id: 'story',
            type: 'Сторис 24 часа',
            description: null,
            unit_price: 10,
            currency: 'USD',
            quantity: 2,
            subtotal: 20,
            sort_order: 1,
          },
        ],
      },
    })
  })

  it('snapshots catalog prices and ignores a client-supplied cheaper price', () => {
    const honest = quoteMarketplaceAdRequest({
      channelId,
      catalog,
      selections: [{ id: 'post', quantity: 1 }],
    })
    const tampered = quoteMarketplaceAdRequest({
      channelId,
      catalog,
      selections: [{ id: 'post', quantity: 1, price: 1, currency: 'AMD' }],
    })
    expect(honest).toEqual(tampered)
    if ('quote' in tampered && tampered.quote.mode === 'price_list') {
      expect(tampered.quote.total).toBe(25)
      expect(tampered.quote.lines[0].unit_price).toBe(25)
    }
  })

  it('rejects services that do not belong to the channel', () => {
    expect(
      quoteMarketplaceAdRequest({
        channelId,
        catalog,
        selections: [{ id: 'other-channel-item', quantity: 1, price: 1 }],
      }),
    ).toEqual({ error: 'Selected services do not belong to this channel' })
  })

  it('creates a custom request with no invented total when the channel has no price list', () => {
    const result = quoteMarketplaceAdRequest({
      channelId,
      catalog: [
        {
          id: 'other',
          channel_id: 'channel-2',
          type: 'Пост',
          description: null,
          price: 40,
          currency: 'USD',
          sort_order: 0,
        },
      ],
      selections: [],
    })
    expect(result).toEqual({
      quote: { mode: 'custom', lines: [], total: null, currency: null },
    })
    expect(formatMarketplaceOrderTotal({ pricing_mode: 'custom', budget: 0 })).toBe(
      'Согласуется с владельцем',
    )
    expect(
      formatMarketplaceOrderTotal({ pricing_mode: 'price_list', budget: 45, budget_currency: 'USD' }),
    ).toBe('$45')
  })

  it('does not allow an empty selection when the channel has a price list', () => {
    expect(quoteMarketplaceAdRequest({ channelId, catalog, selections: [] })).toEqual({
      error: 'Select at least one service from the price list',
    })
  })
})

describe('marketplace order guards', () => {
  it('does not allow a channel owner to order from themselves', () => {
    expect(canCreateMarketplaceOrder('user-1', 'user-1')).toBe(false)
    expect(canCreateMarketplaceOrder('user-1', 'user-2')).toBe(true)
  })

  it('validates file type and size', () => {
    expect(validateAdRequestFileMeta({ type: 'application/pdf', size: 1000 })).toEqual({
      mime: 'application/pdf',
      size: 1000,
    })
    expect(validateAdRequestFileMeta({ type: 'application/x-msdownload', size: 1000 })).toEqual({
      error: 'File type is not allowed',
    })
    expect(validateAdRequestFileMeta({ type: 'application/pdf', size: 20 * 1024 * 1024 })).toEqual({
      error: 'File is too large',
    })
  })

  it('parses unique preferred dates', () => {
    expect(parsePreferredDates(['2026-10-21', '2026-10-20', '2026-10-21'], '2026-10-17')).toEqual({
      dates: ['2026-10-20', '2026-10-21'],
    })
    expect(parsePreferredDates(['2026-10-01'], '2026-10-17')).toEqual({
      error: 'Preferred dates cannot be in the past',
    })
  })
})
