import { describe, expect, it } from 'vitest'
import {
  canAdvertiserConfirmCompletion,
  canCreatorAcceptMarketplaceOrder,
  canCreatorSubmitCompletion,
  getOrderFlowStatusLabel,
  getOrderProgressSteps,
  isDealChatAvailable,
  isMarketplaceOrderDeal,
} from '../order-flow'

describe('marketplace order flow', () => {
  it('keeps chat closed until the creator accepts', () => {
    expect(isDealChatAvailable({ status: 'new' })).toBe(false)
    expect(isDealChatAvailable({ status: 'accepted', accepted_at: '2026-01-01' })).toBe(true)
    expect(isDealChatAvailable({ status: 'cancelled' })).toBe(false)
  })

  it('maps role-specific status labels', () => {
    expect(getOrderFlowStatusLabel({ status: 'new' }, 'advertiser')).toBe('Заявка отправлена')
    expect(getOrderFlowStatusLabel({ status: 'new' }, 'creator')).toBe('Новый запрос')
    expect(getOrderFlowStatusLabel({ status: 'accepted' }, 'advertiser')).toBe(
      'Заказ принят. Оплатите заказ',
    )
    expect(
      getOrderFlowStatusLabel({ status: 'accepted', payment_status: 'paid' }, 'advertiser'),
    ).toBe('Оплата выполнена. Ожидайте выполнения заказа')
    expect(getOrderFlowStatusLabel({ status: 'submitted' }, 'creator')).toBe(
      'Ожидает подтверждения рекламодателя',
    )
  })

  it('uses a single progress path including payment', () => {
    const unpaid = getOrderProgressSteps({ status: 'accepted' })
    expect(unpaid.cancelled).toBe(false)
    expect(unpaid.steps.map((step) => step.id)).toEqual([
      'received',
      'accepted',
      'paid',
      'in_progress',
      'completed',
    ])
    expect(unpaid.steps.find((step) => step.id === 'paid')?.done).toBe(false)

    const paid = getOrderProgressSteps({ status: 'accepted', payment_status: 'paid' })
    expect(paid.steps.find((step) => step.id === 'paid')?.done).toBe(true)
    expect(paid.steps.find((step) => step.id === 'paid')?.current).toBe(true)
  })

  it('shows a cancelled final view', () => {
    expect(getOrderProgressSteps({ status: 'rejected' }).cancelled).toBe(true)
    expect(getOrderProgressSteps({ status: 'cancelled' }).steps).toEqual([])
  })

  it('gates actions by role', () => {
    const acceptedUnpaid = { status: 'accepted', campaign_id: null }
    expect(canCreatorAcceptMarketplaceOrder({ status: 'new' }, 'creator')).toBe(true)
    expect(canCreatorAcceptMarketplaceOrder({ status: 'new', campaign_id: 'c' }, 'creator')).toBe(
      false,
    )
    expect(canAdvertiserConfirmCompletion({ status: 'submitted' }, 'creator')).toBe(false)
    expect(canAdvertiserConfirmCompletion({ status: 'submitted' }, 'advertiser')).toBe(true)
    expect(canCreatorSubmitCompletion({ status: 'in_progress' }, 'advertiser')).toBe(false)
    expect(canCreatorSubmitCompletion({ status: 'in_progress', campaign_id: null }, 'creator')).toBe(
      false,
    )
    expect(
      canCreatorSubmitCompletion(
        { status: 'in_progress', campaign_id: null, payment_status: 'paid' },
        'creator',
      ),
    ).toBe(true)
    expect(isMarketplaceOrderDeal(acceptedUnpaid)).toBe(true)
  })
})
