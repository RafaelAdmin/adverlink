import { describe, expect, it } from 'vitest'
import { getDashboardNavItems } from '../dashboard-nav'
import {
  FORBIDDEN_ORDER_NAV_TERMS,
  MY_ORDERS_LABEL,
  MY_ORDERS_PATH,
  canOpenOrderPage,
  canViewOrderInSpace,
  filterOrdersForSpace,
  formatOrderAmountLabel,
  formatOrderServicesLabel,
  hasAdvertiserOrderNotice,
  hasCreatorOrderNotice,
  navContainsForbiddenOrderTerm,
  orderRejectionReason,
  shouldRedirectMarketplaceRequestsTab,
} from '../my-orders'

const ownerId = 'owner-1'
const advertiserId = 'adv-1'
const channelId = 'channel-1'

const creatorOrder = {
  id: 'ord-1',
  channel_id: channelId,
  advertiser_id: advertiserId,
  advertiser_name: 'Brand',
  pricing_mode: 'price_list' as const,
  budget: 45,
  budget_currency: 'USD',
  status: 'new',
  ad_request_price_snapshots: [
    { type: 'Пост 24 часа в ленте', quantity: 1, sort_order: 0 },
    { type: 'Сторис 24 часа', quantity: 2, sort_order: 1 },
  ],
}

const customOrder = {
  ...creatorOrder,
  id: 'ord-2',
  pricing_mode: 'custom' as const,
  budget: null,
  ad_request_price_snapshots: [],
}

describe('Мои заказы by space', () => {
  it('shows only channel orders in the creator space', () => {
    const visible = filterOrdersForSpace(
      'creator',
      [
        creatorOrder,
        { ...creatorOrder, id: 'other', channel_id: 'channel-2' },
      ],
      { userId: ownerId, ownedChannelIds: [channelId] },
    )
    expect(visible.map((item) => item.id)).toEqual(['ord-1'])
    expect(formatOrderServicesLabel('creator', creatorOrder)).toBe(
      'Пост 24 часа в ленте × 1, Сторис 24 часа × 2',
    )
    expect(formatOrderAmountLabel('creator', creatorOrder)).toBe('$45')
    expect(formatOrderServicesLabel('creator', customOrder)).toBe('Цена согласуется')
  })

  it('shows only self-created orders in the advertiser space', () => {
    const visible = filterOrdersForSpace(
      'advertiser',
      [
        creatorOrder,
        { ...creatorOrder, id: 'foreign', advertiser_id: 'someone-else' },
      ],
      { userId: advertiserId, ownedChannelIds: [] },
    )
    expect(visible.map((item) => item.id)).toEqual(['ord-1'])
    expect(formatOrderServicesLabel('advertiser', customOrder)).toBe('Согласуется с владельцем')
    expect(formatOrderAmountLabel('advertiser', customOrder)).toBe('Согласуется с владельцем')
    expect(orderRejectionReason({ status: 'rejected', creator_note: 'Не подходит' })).toBe(
      'Не подходит',
    )
  })

  it('does not expose Мои запросы in dashboard navigation', () => {
    for (const role of ['creator', 'advertiser'] as const) {
      const labels = getDashboardNavItems(role).map((item) => item.label)
      expect(labels).toContain(MY_ORDERS_LABEL)
      expect(labels.filter((label) => label === MY_ORDERS_LABEL)).toHaveLength(1)
      expect(labels.some((label) => navContainsForbiddenOrderTerm(label))).toBe(false)
      for (const term of FORBIDDEN_ORDER_NAV_TERMS) {
        expect(labels.join(' ')).not.toContain(term)
      }
    }
  })

  it('blocks viewing someone else’s order unless admin', () => {
    const stranger = { userId: 'stranger', ownedChannelIds: [] as string[] }
    expect(canViewOrderInSpace('creator', creatorOrder, stranger)).toBe(false)
    expect(canViewOrderInSpace('advertiser', creatorOrder, stranger)).toBe(false)
    expect(canOpenOrderPage({ ...creatorOrder, channel_owner_id: ownerId }, stranger)).toBe(false)
    expect(
      canOpenOrderPage({ ...creatorOrder, channel_owner_id: ownerId }, { ...stranger, isAdmin: true }),
    ).toBe(true)
    expect(canOpenOrderPage({ ...creatorOrder, channel_owner_id: ownerId }, { userId: ownerId, ownedChannelIds: [channelId] })).toBe(true)
    expect(canOpenOrderPage({ ...creatorOrder, channel_owner_id: ownerId }, { userId: advertiserId, ownedChannelIds: [] })).toBe(true)
  })
})

describe('order notices and legacy routes', () => {
  it('notifies the creator about a new unviewed order on their channel', () => {
    expect(
      hasCreatorOrderNotice({
        status: 'new',
        creator_viewed_at: null,
        created_at: '2026-10-17T10:00:00.000Z',
      }),
    ).toBe(true)
    expect(
      hasCreatorOrderNotice({
        status: 'new',
        creator_viewed_at: '2026-10-17T11:00:00.000Z',
        updated_at: '2026-10-17T10:00:00.000Z',
      }),
    ).toBe(false)
  })

  it('notifies the advertiser only about updates to their own orders', () => {
    expect(
      hasAdvertiserOrderNotice({
        status: 'new',
        campaign_id: null,
        advertiser_viewed_at: null,
        created_at: '2026-10-17T10:00:00.000Z',
      }),
    ).toBe(false)
    expect(
      hasAdvertiserOrderNotice({
        status: 'rejected',
        campaign_id: null,
        advertiser_viewed_at: null,
        updated_at: '2026-10-17T12:00:00.000Z',
      }),
    ).toBe(true)
  })

  it('redirects legacy Мои запросы routes and marketplace tabs', () => {
    expect(MY_ORDERS_PATH).toBe('/dashboard/orders')
    expect(shouldRedirectMarketplaceRequestsTab('requests')).toBe(true)
    expect(shouldRedirectMarketplaceRequestsTab('mine')).toBe(true)
    expect(shouldRedirectMarketplaceRequestsTab('catalog')).toBe(false)
  })
})
