import { describe, expect, it } from 'vitest'
import { validateNotifyAuthorization } from '@/lib/notify-auth'

const deal = {
  id: 'deal-1',
  channel_id: 'channel-1',
  advertiser_id: 'advertiser-1',
  status: 'payment_pending',
  channel_owner_id: 'owner-1',
}

describe('validateNotifyAuthorization', () => {
  it('allows advertiser to notify on new ad request', () => {
    expect(
      validateNotifyAuthorization('new_ad_request', 'advertiser-1', deal, false),
    ).toBe(true)
  })

  it('blocks channel owner from faking new ad request', () => {
    expect(
      validateNotifyAuthorization('new_ad_request', 'owner-1', deal, false),
    ).toBe(false)
  })

  it('allows owner to notify on accepted deal', () => {
    expect(
      validateNotifyAuthorization(
        'deal_accepted',
        'owner-1',
        { ...deal, status: 'accepted' },
        false,
      ),
    ).toBe(true)
  })

  it('allows advertiser to notify on completed deal', () => {
    expect(
      validateNotifyAuthorization(
        'deal_completed',
        'advertiser-1',
        { ...deal, status: 'completed' },
        false,
      ),
    ).toBe(true)
  })

  it('blocks advertiser from deal_accepted notification', () => {
    expect(
      validateNotifyAuthorization(
        'deal_accepted',
        'advertiser-1',
        { ...deal, status: 'accepted' },
        false,
      ),
    ).toBe(false)
  })

  it('allows admin bypass', () => {
    expect(
      validateNotifyAuthorization('new_ad_request', 'random-user', deal, true),
    ).toBe(true)
  })
})
