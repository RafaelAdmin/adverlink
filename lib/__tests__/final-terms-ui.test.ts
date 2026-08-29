import { describe, expect, it } from 'vitest'
import { isStaleTermsApiError } from '@/lib/deal-api-client'
import {
  buildFinalTermsFormDefaults,
  canShowAcceptAction,
  canShowProposeAction,
  coerceAdRequestRow,
  formValuesToProposalPayload,
  getFinalTermsUiState,
  hasPartialTermsData,
  isFinalTermsReadOnly,
  shouldShowFinalTermsSection,
  shouldShowTermsSummary,
  validateFinalTermsForm,
} from '@/lib/final-terms-ui'

const userA = 'user-a'
const userB = 'user-b'

describe('getFinalTermsUiState', () => {
  it('none → proposer can propose', () => {
    const state = getFinalTermsUiState({ terms_status: 'none' }, userA)
    expect(state).toBe('none')
    expect(canShowProposeAction(state)).toBe(true)
    expect(canShowAcceptAction(state)).toBe(false)
  })

  it('proposer sees waiting state without accept', () => {
    const state = getFinalTermsUiState(
      { terms_status: 'proposed', final_terms_proposed_by: userA },
      userA,
    )
    expect(state).toBe('proposed_by_self')
    expect(canShowProposeAction(state)).toBe(true)
    expect(canShowAcceptAction(state)).toBe(false)
  })

  it('other participant sees accept + counter-propose', () => {
    const state = getFinalTermsUiState(
      { terms_status: 'proposed', final_terms_proposed_by: userA },
      userB,
    )
    expect(state).toBe('proposed_by_other')
    expect(canShowAcceptAction(state)).toBe(true)
    expect(canShowProposeAction(state)).toBe(true)
  })

  it('accepted → read-only summary', () => {
    const state = getFinalTermsUiState({ terms_status: 'accepted' }, userA)
    expect(state).toBe('accepted')
    expect(isFinalTermsReadOnly(state)).toBe(true)
    expect(canShowProposeAction(state)).toBe(false)
  })

  it('locked → read-only', () => {
    const state = getFinalTermsUiState({ terms_status: 'locked' }, userA)
    expect(state).toBe('locked')
    expect(isFinalTermsReadOnly(state)).toBe(true)
  })
})

describe('legacy compatibility', () => {
  it('coerceAdRequestRow fills lifecycle defaults for legacy rows', () => {
    const row = coerceAdRequestRow({
      id: 'deal-1',
      status: 'in_progress',
      posts_count: 2,
      budget: 500,
    } as Record<string, unknown>)
    expect(row.terms_status).toBe('none')
    expect(row.content_status).toBe('not_required')
    expect(row.content_mode).toBeNull()
  })

  it('legacy null fields do not crash defaults builder', () => {
    const defaults = buildFinalTermsFormDefaults({
      content_mode: null,
      placements_count: null,
      terms_status: 'none',
      budget: 500,
      posts_count: 2,
    })
    expect(defaults.placementsCount).toBe(2)
    expect(defaults.finalPrice).toBe(500)
    expect(defaults.contentMode).toBe('advertiser_provides')
  })

  it('shows section for in_progress legacy deal', () => {
    expect(shouldShowFinalTermsSection('in_progress')).toBe(true)
  })

  it('hides section for cancelled deals', () => {
    expect(shouldShowFinalTermsSection('cancelled')).toBe(false)
  })

  it('none without lifecycle fields hides summary', () => {
    expect(hasPartialTermsData({ terms_status: 'none' })).toBe(false)
    expect(shouldShowTermsSummary({ terms_status: 'none' }, 'none')).toBe(false)
  })
})

describe('validateFinalTermsForm', () => {
  it('rejects invalid currency and negative price', () => {
    expect(
      validateFinalTermsForm({
        contentMode: 'advertiser_provides',
        placementsCount: 1,
        placementStartAt: '',
        placementEndAt: '',
        finalPrice: -1,
        finalPriceCurrency: 'USD',
        additionalTerms: '',
      }),
    ).toMatch(/отрицательной/)

    expect(
      validateFinalTermsForm({
        contentMode: 'advertiser_provides',
        placementsCount: 1,
        placementStartAt: '',
        placementEndAt: '',
        finalPrice: 10,
        finalPriceCurrency: 'BTC' as never,
        additionalTerms: '',
      }),
    ).toMatch(/валюту/)
  })

  it('maps form values to API payload without locked status', () => {
    const payload = formValuesToProposalPayload({
      contentMode: 'creator_creates',
      placementsCount: 3,
      placementStartAt: '2026-04-01',
      placementEndAt: '2026-04-10',
      finalPrice: 100,
      finalPriceCurrency: 'EUR',
      additionalTerms: 'Extra note',
    })
    expect(payload.contentMode).toBe('creator_creates')
    expect(payload.finalTerms).toEqual({ notes: 'Extra note' })
    expect(payload).not.toHaveProperty('terms_status')
    expect(payload).not.toHaveProperty('termsStatus')
  })
})

describe('stale terms API handling', () => {
  it('409 maps to stale terms error helper', () => {
    expect(isStaleTermsApiError({ ok: false, error: 'stale', status: 409 })).toBe(true)
    expect(isStaleTermsApiError({ ok: false, error: 'forbidden', status: 403 })).toBe(false)
  })
})

describe('terms lock client guard', () => {
  it('no client payload path sets terms_status locked', () => {
    const payload = formValuesToProposalPayload({
      contentMode: 'advertiser_provides',
      placementsCount: 1,
      placementStartAt: '',
      placementEndAt: '',
      finalPrice: 0,
      finalPriceCurrency: 'USD',
      additionalTerms: '',
    })
    expect(Object.keys(payload)).not.toContain('terms_status')
    expect(Object.keys(payload)).not.toContain('termsStatus')
  })
})
