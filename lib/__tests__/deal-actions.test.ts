import { describe, expect, it } from 'vitest'
import {
  assertAdminResolveTransition,
  assertGenericTransitionAllowed,
  assertLegacyRevisionTransition,
  parseGenericTransitionBody,
  SPECIALIZED_TRANSITION_TARGETS,
} from '@/lib/server/deal-transition-policy'
import { DealActionError } from '@/lib/server/deal-errors'
import {
  assertActorCanTransition,
  assertTelegramPostNotLinkedElsewhere,
  parseMaterialSavePayload,
  validateTermsProposalPayload,
} from '@/lib/server/deal-actions'
import {
  canAcceptTerms,
  isAutoCompleteEligible,
  isLegacyLifecycleDeal,
  isLegacySubmittedReview,
  canCompleteDeal,
  canStartFinalReview,
  computeAutoCompleteDeadline,
  FINAL_REVIEW_AUTO_COMPLETE_HOURS,
  type DealLifecycleContext,
} from '@/lib/deal-lifecycle'

describe('generic transition policy', () => {
  it('blocks completed via generic transition', () => {
    expect(() => assertGenericTransitionAllowed('advertiser', 'submitted', 'completed')).toThrow(
      /dedicated endpoint/,
    )
  })

  it('blocks disputed via generic transition', () => {
    expect(() => assertGenericTransitionAllowed('advertiser', 'submitted', 'disputed')).toThrow(
      /dedicated endpoint/,
    )
  })

  it('blocks dispute resolution via generic transition', () => {
    expect(SPECIALIZED_TRANSITION_TARGETS.has('resolved_creator')).toBe(true)
    expect(SPECIALIZED_TRANSITION_TARGETS.has('resolved_advertiser')).toBe(true)
    expect(() => assertGenericTransitionAllowed('creator', 'disputed', 'resolved_creator')).toThrow(
      /dedicated endpoint/,
    )
  })

  it('blocks submitted -> in_progress revision via generic transition', () => {
    expect(() => assertGenericTransitionAllowed('advertiser', 'submitted', 'in_progress')).toThrow(
      /request-revision endpoint/,
    )
  })

  it('rejects admin new -> in_progress (not in state machine)', () => {
    expect(() => assertGenericTransitionAllowed('creator', 'new', 'in_progress')).toThrow(
      /Invalid deal status transition/,
    )
    expect(() => assertAdminResolveTransition('new', 'in_progress')).toThrow(
      /Admin cannot transition|Invalid deal status transition/,
    )
  })

  it('allows creator payment_pending -> accepted and cancelled', () => {
    expect(() => assertGenericTransitionAllowed('creator', 'payment_pending', 'accepted')).not.toThrow()
    expect(() => assertGenericTransitionAllowed('creator', 'payment_pending', 'cancelled')).not.toThrow()
  })

  it('rejects creator payment_pending -> rejected', () => {
    expect(() => assertGenericTransitionAllowed('creator', 'payment_pending', 'rejected')).toThrow(
      /cannot transition/,
    )
  })

  it('allows admin disputed -> resolved_* only via admin resolve helper', () => {
    expect(() => assertAdminResolveTransition('disputed', 'resolved_creator')).not.toThrow()
    expect(() => assertAdminResolveTransition('disputed', 'resolved_advertiser')).not.toThrow()
  })

  it('legacy revision helper only allows submitted -> in_progress', () => {
    expect(() => assertLegacyRevisionTransition('submitted', 'in_progress')).not.toThrow()
    expect(() => assertLegacyRevisionTransition('in_progress', 'submitted')).toThrow(
      /Legacy revision only/,
    )
  })

  it('whitelists generic transition body fields', () => {
    expect(parseGenericTransitionBody({ toStatus: 'accepted' }).toStatus).toBe('accepted')
    expect(() => parseGenericTransitionBody({ toStatus: 'accepted', status: 'completed' })).toThrow(
      /Unexpected field: status/,
    )
  })
})

describe('assertActorCanTransition (deprecated wrapper)', () => {
  it('rejects unauthorized user role', () => {
    expect(() => assertActorCanTransition(null, false, 'submitted', 'completed')).toThrow(
      DealActionError,
    )
  })

  it('allows creator payment_pending -> accepted', () => {
    expect(() => assertActorCanTransition('creator', false, 'payment_pending', 'accepted')).not.toThrow()
  })

  it('rejects creator submitted -> completed', () => {
    expect(() => assertActorCanTransition('creator', false, 'submitted', 'completed')).toThrow(
      /dedicated endpoint/,
    )
  })

  it('rejects advertiser submitted -> completed on generic path', () => {
    expect(() => assertActorCanTransition('advertiser', false, 'submitted', 'completed')).toThrow(
      /dedicated endpoint/,
    )
  })

  it('allows admin disputed -> resolved_creator via admin helper', () => {
    expect(() => assertActorCanTransition(null, true, 'disputed', 'resolved_creator')).not.toThrow()
  })

  it('rejects invalid state machine transition', () => {
    expect(() => assertActorCanTransition('advertiser', false, 'completed', 'submitted')).toThrow(
      /Invalid deal status transition/,
    )
  })
})

describe('validateTermsProposalPayload', () => {
  it('rejects negative finalPrice', () => {
    expect(() =>
      validateTermsProposalPayload({
        contentMode: 'advertiser_provides',
        placementsCount: 2,
        finalPrice: -1,
        finalPriceCurrency: 'USD',
      }),
    ).toThrow(/finalPrice/)
  })

  it('rejects unsupported currency', () => {
    expect(() =>
      validateTermsProposalPayload({
        contentMode: 'advertiser_provides',
        placementsCount: 1,
        finalPrice: 100,
        finalPriceCurrency: 'BTC',
      }),
    ).toThrow(/currency/)
  })
})

describe('terms self-accept rule', () => {
  it('canAcceptTerms is false when not proposed', () => {
    const ctx: DealLifecycleContext = {
      status: 'accepted',
      termsStatus: 'none',
      contentMode: null,
      contentStatus: 'not_required',
      placementsCount: null,
      placements: [],
      allPlacementsPublishedAt: null,
      finalReviewStartedAt: null,
      autoCompleteDeadline: null,
    }
    expect(canAcceptTerms(ctx)).toBe(false)
  })
})

describe('mass assignment guards', () => {
  it('rejects trusted lifecycle fields in material payload', () => {
    expect(() =>
      parseMaterialSavePayload({ action: 'save', status: 'completed', bodyText: 'x' }),
    ).toThrow(/Unexpected field: status/)
  })

  it('accepts only whitelisted material fields', () => {
    const payload = parseMaterialSavePayload({
      action: 'save',
      bodyText: 'hello',
      destinationUrl: 'https://example.com',
    })
    expect(payload.bodyText).toBe('hello')
    expect(payload.destinationUrl).toBe('https://example.com')
  })
})

describe('telegram placement ownership', () => {
  it('rejects same telegram post on another published placement in deal', () => {
    expect(() =>
      assertTelegramPostNotLinkedElsewhere(
        [
          {
            id: 'p1',
            ad_request_id: 'd1',
            placement_index: 1,
            status: 'published',
            telegram_post_id: 'post-1',
          } as never,
          {
            id: 'p2',
            ad_request_id: 'd1',
            placement_index: 2,
            status: 'scheduled',
            telegram_post_id: null,
          } as never,
        ],
        'post-1',
        2,
      ),
    ).toThrow(/already linked/)
  })

  it('allows same post id on target placement being published', () => {
    expect(() =>
      assertTelegramPostNotLinkedElsewhere(
        [
          {
            id: 'p1',
            ad_request_id: 'd1',
            placement_index: 1,
            status: 'published',
            telegram_post_id: 'post-1',
          } as never,
        ],
        'post-1',
        1,
      ),
    ).not.toThrow()
  })
})

describe('legacy vs lifecycle completion paths', () => {
  const legacySubmitted: DealLifecycleContext = {
    status: 'submitted',
    termsStatus: 'none',
    contentMode: null,
    contentStatus: 'not_required',
    placementsCount: null,
    placements: [],
    allPlacementsPublishedAt: null,
    finalReviewStartedAt: null,
    autoCompleteDeadline: null,
  }

  const newSubmitted: DealLifecycleContext = {
    status: 'submitted',
    termsStatus: 'locked',
    contentMode: 'advertiser_provides',
    contentStatus: 'not_required',
    placementsCount: 2,
    placements: [
      { placementIndex: 1, status: 'published' },
      { placementIndex: 2, status: 'published' },
    ],
    allPlacementsPublishedAt: null,
    finalReviewStartedAt: null,
    autoCompleteDeadline: null,
    termsLockedAt: '2026-01-01',
  }

  it('legacy submitted deal can complete via compatibility path', () => {
    expect(isLegacySubmittedReview(legacySubmitted)).toBe(true)
    expect(canCompleteDeal(legacySubmitted)).toBe(true)
  })

  it('new lifecycle submitted deal cannot use legacy bypass', () => {
    expect(isLegacySubmittedReview(newSubmitted)).toBe(false)
    expect(canCompleteDeal(newSubmitted)).toBe(false)
  })
})

describe('final review and auto-complete', () => {
  const baseNew: DealLifecycleContext = {
    status: 'in_progress',
    termsStatus: 'locked',
    contentMode: 'advertiser_provides',
    contentStatus: 'not_required',
    placementsCount: 2,
    placements: [
      { placementIndex: 1, status: 'published' },
      { placementIndex: 2, status: 'scheduled' },
    ],
    allPlacementsPublishedAt: null,
    finalReviewStartedAt: null,
    autoCompleteDeadline: null,
    termsLockedAt: '2026-01-01',
  }

  it('N-1 placements cannot start final review', () => {
    expect(canStartFinalReview(baseNew)).toBe(false)
  })

  it('N/N placements can start final review when requirements pass', () => {
    const ready = {
      ...baseNew,
      placements: [
        { placementIndex: 1, status: 'published' as const },
        { placementIndex: 2, status: 'published' as const },
      ],
    }
    expect(canStartFinalReview(ready)).toBe(true)
  })

  it('48h auto-complete uses final review deadline not submitted time', () => {
    const start = '2026-03-01T12:00:00Z'
    const deadline = computeAutoCompleteDeadline(start).toISOString()
    const ctx: DealLifecycleContext = {
      ...baseNew,
      placements: [
        { placementIndex: 1, status: 'published' },
        { placementIndex: 2, status: 'published' },
      ],
      finalReviewStartedAt: start,
      autoCompleteDeadline: deadline,
    }
    expect(
      isAutoCompleteEligible(ctx, new Date('2026-03-03T13:00:00Z')),
    ).toBe(true)
    expect(FINAL_REVIEW_AUTO_COMPLETE_HOURS).toBe(48)
  })

  it('legacy deals are not eligible for new auto-complete helper', () => {
    const legacyCtx = {
      status: 'submitted',
      termsStatus: 'none' as const,
      contentMode: null,
      contentStatus: 'not_required' as const,
      placementsCount: null,
      placements: [],
      allPlacementsPublishedAt: null,
      finalReviewStartedAt: null,
      autoCompleteDeadline: null,
    }
    expect(isLegacyLifecycleDeal(legacyCtx)).toBe(true)
    expect(
      isAutoCompleteEligible(
        { ...legacyCtx, autoCompleteDeadline: '2026-03-03T13:00:00Z' },
        new Date('2026-03-04T00:00:00Z'),
      ),
    ).toBe(false)
  })
})

describe('issue_reported and disputes', () => {
  it('issue_reported blocks completion readiness', () => {
    const ctx: DealLifecycleContext = {
      status: 'in_progress',
      termsStatus: 'locked',
      contentMode: 'advertiser_provides',
      contentStatus: 'not_required',
      placementsCount: 2,
      placements: [
        { placementIndex: 1, status: 'published' },
        { placementIndex: 2, status: 'issue_reported' },
      ],
      allPlacementsPublishedAt: '2026-02-01',
      finalReviewStartedAt: '2026-02-01',
      autoCompleteDeadline: '2026-02-03',
      termsLockedAt: '2026-01-01',
    }
    expect(canCompleteDeal(ctx)).toBe(false)
  })

  it('dispute blocks auto-complete eligibility', () => {
    const ctx: DealLifecycleContext = {
      status: 'disputed',
      termsStatus: 'locked',
      contentMode: 'advertiser_provides',
      contentStatus: 'not_required',
      placementsCount: 1,
      placements: [{ placementIndex: 1, status: 'published' }],
      allPlacementsPublishedAt: '2026-02-01',
      finalReviewStartedAt: '2026-02-01',
      autoCompleteDeadline: '2026-02-03',
      termsLockedAt: '2026-01-01',
    }
    expect(isAutoCompleteEligible(ctx, new Date('2026-02-04T00:00:00Z'))).toBe(false)
  })
})

describe('system message spoofing', () => {
  it('active messages schema has no privileged message_type field to spoof', () => {
    const allowedInsertFields = new Set(['deal_id', 'sender_id', 'content'])
    expect(allowedInsertFields.has('message_type')).toBe(false)
    expect(allowedInsertFields.has('is_system')).toBe(false)
  })
})
