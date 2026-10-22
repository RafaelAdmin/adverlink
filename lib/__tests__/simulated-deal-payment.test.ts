import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildSimulatedPaymentLedger,
  countsAsRealRevenue,
  isDealAwaitingSimulatedPayment,
  isDealPaymentComplete,
  isSimulatedDealPayment,
  resolveDealPaymentAmount,
  sumRealRevenue,
} from '@/lib/deal-payments'
import { validateSimulatedDealPayment } from '@/lib/server/simulated-deal-payment'
import type { DealRecord } from '@/lib/server/deal-repository'
import { buildLifecycleContextFromAdRequest } from '@/lib/placements-ui'
import { coerceAdRequestRow } from '@/lib/final-terms-ui'

function baseDeal(overrides: Partial<DealRecord> = {}): DealRecord {
  return {
    id: 'deal-1',
    status: 'accepted',
    channel_id: 'ch-1',
    campaign_id: null,
    advertiser_id: 'adv-1',
    advertiser_name: 'Advertiser',
    budget: 1000,
    message: 'msg',
    posts_count: 1,
    proof_links: null,
    creator_note: null,
    advertiser_note: null,
    payment_status: 'pending',
    dispute_reason: null,
    accepted_at: '2026-01-01T00:00:00Z',
    completed_at: null,
    updated_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    content_mode: 'advertiser_provides',
    budget_currency: 'AMD',
    final_price: 5000,
    final_price_currency: 'AMD',
    placements_count: 2,
    placement_start_at: null,
    placement_end_at: null,
    terms_status: 'accepted',
    final_terms: null,
    final_terms_proposed_by: 'creator-1',
    final_terms_proposed_at: '2026-01-01T00:00:00Z',
    final_terms_accepted_at: '2026-01-02T00:00:00Z',
    terms_locked_at: null,
    content_status: 'not_required',
    content_submitted_at: null,
    content_approved_at: null,
    all_placements_published_at: null,
    final_review_started_at: null,
    auto_complete_deadline: null,
    payment_mode: null,
    payment_amount: null,
    payment_currency: null,
    paid_at: null,
    payment_provider: null,
    payment_environment: null,
    payment_reference: null,
    channels: { owner_id: 'creator-1', telegram_username: 'test', platform: 'telegram' },
    ...overrides,
  }
}

describe('resolveDealPaymentAmount', () => {
  it('derives amount from server-side final terms only', () => {
    expect(resolveDealPaymentAmount(baseDeal())).toEqual({
      amount: 5000,
      currency: 'AMD',
      placementsCount: 2,
    })
  })

  it('falls back to marketplace budget when final terms are unset', () => {
    expect(
      resolveDealPaymentAmount(
        baseDeal({
          final_price: null,
          final_price_currency: null,
          budget: 120,
          budget_currency: 'USD',
          posts_count: 3,
        }),
      ),
    ).toEqual({
      amount: 120,
      currency: 'USD',
      placementsCount: 2,
    })
  })
})

describe('stub ledger', () => {
  it('debits the advertiser and credits 90/10', () => {
    expect(buildSimulatedPaymentLedger(100, 'USD')).toEqual({
      debitAdvertiser: 100,
      creditCreator: 90,
      creditPlatform: 10,
      commissionPercent: 10,
      currency: 'USD',
    })
  })
})

describe('revenue classification', () => {
  it('excludes simulated payments from real revenue', () => {
    expect(countsAsRealRevenue({ payment_mode: 'simulated', payment_status: 'paid' })).toBe(false)
    expect(countsAsRealRevenue({ payment_mode: 'real', payment_status: 'paid' })).toBe(true)
    expect(sumRealRevenue([
      { payment_mode: 'simulated', payment_status: 'paid', budget: 100, final_price: 100 },
      { payment_mode: 'real', payment_status: 'paid', budget: 200, final_price: 200 },
    ])).toBe(200)
  })
})

describe('validateSimulatedDealPayment', () => {
  beforeEach(() => {
    vi.stubEnv('SIMULATED_PAYMENTS_ENABLED', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('allows valid advertiser payment when terms accepted', () => {
    expect(validateSimulatedDealPayment(baseDeal(), 'adv-1', 'advertiser')).toEqual({
      ok: true,
      alreadyPaid: false,
    })
  })

  it('rejects creator attempting payment', () => {
    const result = validateSimulatedDealPayment(baseDeal(), 'creator-1', 'creator')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(403)
  })

  it('rejects wrong advertiser', () => {
    const result = validateSimulatedDealPayment(baseDeal(), 'other-user', 'advertiser')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(403)
  })

  it('allows marketplace order payment after accept without terms negotiation', () => {
    expect(
      validateSimulatedDealPayment(
        baseDeal({
          campaign_id: null,
          terms_status: 'none',
          content_mode: null,
          placements_count: null,
          final_price: null,
          final_price_currency: null,
          budget: 80,
          budget_currency: 'USD',
        }),
        'adv-1',
        'advertiser',
      ),
    ).toEqual({ ok: true, alreadyPaid: false })
  })

  it('rejects payment before terms accepted', () => {
    const result = validateSimulatedDealPayment(
      baseDeal({ terms_status: 'proposed' }),
      'adv-1',
      'advertiser',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/accepted/)
  })

  it('is idempotent when already paid', () => {
    expect(
      validateSimulatedDealPayment(
        baseDeal({
          payment_status: 'paid',
          payment_mode: 'simulated',
          terms_status: 'locked',
          terms_locked_at: '2026-01-03T00:00:00Z',
        }),
        'adv-1',
        'advertiser',
      ),
    ).toEqual({ ok: true, alreadyPaid: true })
  })

  it('rejects when simulated payments disabled', () => {
    vi.stubEnv('SIMULATED_PAYMENTS_ENABLED', 'false')
    const result = validateSimulatedDealPayment(baseDeal(), 'adv-1', 'advertiser')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(503)
  })

  it('still allows marketplace stub payment when the flag is off', () => {
    vi.stubEnv('SIMULATED_PAYMENTS_ENABLED', 'false')
    expect(
      validateSimulatedDealPayment(
        baseDeal({
          campaign_id: null,
          terms_status: 'none',
          content_mode: null,
          placements_count: null,
          final_price: null,
          final_price_currency: null,
          budget: 80,
          budget_currency: 'USD',
        }),
        'adv-1',
        'advertiser',
      ),
    ).toEqual({ ok: true, alreadyPaid: false })
  })

  it('allows marketplace payment while work is already in progress', () => {
    expect(
      validateSimulatedDealPayment(
        baseDeal({
          status: 'in_progress',
          campaign_id: null,
          terms_status: 'none',
          content_mode: null,
          placements_count: null,
          final_price: null,
          final_price_currency: null,
          budget: 80,
          budget_currency: 'USD',
        }),
        'adv-1',
        'advertiser',
      ),
    ).toEqual({ ok: true, alreadyPaid: false })
  })
})

describe('payment UI state helpers', () => {
  it('detects awaiting simulated payment on new lifecycle deals', () => {
    const request = coerceAdRequestRow({
      id: 'deal-1',
      status: 'accepted',
      terms_status: 'accepted',
      content_mode: 'advertiser_provides',
      content_status: 'not_required',
      placements_count: 2,
      posts_count: 1,
      advertiser_name: 'A',
      advertiser_contact: 'c',
      message: 'm',
      created_at: '2026-01-01',
    } as Record<string, unknown>)
    const ctx = buildLifecycleContextFromAdRequest(request, [])
    expect(isDealAwaitingSimulatedPayment(request, ctx)).toBe(true)
    expect(isDealPaymentComplete(request)).toBe(false)
  })

  it('marks simulated paid deals', () => {
    const request = coerceAdRequestRow({
      id: 'deal-1',
      status: 'accepted',
      terms_status: 'locked',
      terms_locked_at: '2026-01-03',
      payment_status: 'paid',
      payment_mode: 'simulated',
      content_mode: 'advertiser_provides',
      content_status: 'not_required',
      placements_count: 2,
      posts_count: 1,
      advertiser_name: 'A',
      advertiser_contact: 'c',
      message: 'm',
      created_at: '2026-01-01',
    } as Record<string, unknown>)
    expect(isSimulatedDealPayment(request)).toBe(true)
    expect(isDealPaymentComplete(request)).toBe(true)
  })
})
