import { describe, expect, it } from 'vitest'
import {
  assertDealStatusTransition,
  canAcceptTerms,
  canApproveCreatorContent,
  canCompleteDeal,
  canLockTerms,
  canProposeTerms,
  canPublishPlacement,
  canReportPlacementIssue,
  canRequestContentChanges,
  canStartFinalReview,
  canSubmitCreatorContent,
  canTransitionDealStatus,
  canTransitionPlacementStatus,
  canTransitionTermsStatus,
  computeAutoCompleteDeadline,
  countPublishedPlacements,
  FINAL_REVIEW_AUTO_COMPLETE_HOURS,
  getTargetFinancialOutcome,
  hasLifecyclePhase0Signals,
  isAllPlacementsPublished,
  isAutoCompleteEligible,
  isCreatorContentReady,
  isDealCompletionReady,
  isInFinalReview,
  isLegacyLifecycleDeal,
  isLegacySubmittedReview,
  isNewLifecycleCompletionReady,
  isNewLifecycleDeal,
  isTerminalDealStatus,
  normalizeDealStatus,
  supportsPerPlacementAdvertiserApproval,
  type DealLifecycleContext,
  type DealPlacementSnapshot,
} from '@/lib/deal-lifecycle'

function baseCtx(overrides: Partial<DealLifecycleContext> = {}): DealLifecycleContext {
  return {
    status: 'accepted',
    termsStatus: 'none',
    contentMode: null,
    contentStatus: 'not_required',
    placementsCount: null,
    placements: [],
    allPlacementsPublishedAt: null,
    finalReviewStartedAt: null,
    autoCompleteDeadline: null,
    ...overrides,
  }
}

/** Minimal new-lifecycle deal fixture (NOT legacy). */
function newLifecycleCtx(overrides: Partial<DealLifecycleContext> = {}): DealLifecycleContext {
  return baseCtx({
    contentMode: 'advertiser_provides',
    contentStatus: 'not_required',
    placementsCount: 2,
    termsStatus: 'locked',
    termsLockedAt: '2026-01-01T00:00:00Z',
    placements: placements([1, 'scheduled'], [2, 'scheduled']),
    ...overrides,
  })
}

function placements(...items: Array<[number, DealPlacementSnapshot['status']]>): DealPlacementSnapshot[] {
  return items.map(([placementIndex, status]) => ({ placementIndex, status }))
}

describe('normalizeDealStatus', () => {
  it('maps legacy replied to in_progress', () => {
    expect(normalizeDealStatus('replied')).toBe('in_progress')
  })

  it('passes through known statuses', () => {
    expect(normalizeDealStatus('submitted')).toBe('submitted')
  })

  it('falls back unknown values to new', () => {
    expect(normalizeDealStatus('unknown')).toBe('new')
  })
})

describe('legacy lifecycle detection', () => {
  it('classifies empty Phase 0 defaults as legacy', () => {
    const ctx = baseCtx({ status: 'submitted' })
    expect(isLegacyLifecycleDeal(ctx)).toBe(true)
    expect(isNewLifecycleDeal(ctx)).toBe(false)
    expect(hasLifecyclePhase0Signals(ctx)).toBe(false)
  })

  it('does NOT classify as legacy when contentMode is set', () => {
    const ctx = baseCtx({ status: 'submitted', contentMode: 'advertiser_provides' })
    expect(isLegacyLifecycleDeal(ctx)).toBe(false)
    expect(hasLifecyclePhase0Signals(ctx)).toBe(true)
  })

  it('does NOT classify as legacy when placementsCount is set', () => {
    const ctx = baseCtx({ status: 'submitted', placementsCount: 4 })
    expect(isLegacyLifecycleDeal(ctx)).toBe(false)
  })

  it('does NOT classify as legacy when placement rows exist', () => {
    const ctx = baseCtx({
      status: 'submitted',
      placements: placements([1, 'published']),
    })
    expect(isLegacyLifecycleDeal(ctx)).toBe(false)
  })

  it('does NOT classify as legacy when terms progressed beyond none', () => {
    const ctx = baseCtx({ status: 'submitted', termsStatus: 'accepted' })
    expect(isLegacyLifecycleDeal(ctx)).toBe(false)
  })

  it('isLegacySubmittedReview requires both submitted status AND legacy deal', () => {
    expect(isLegacySubmittedReview(baseCtx({ status: 'submitted' }))).toBe(true)
    expect(
      isLegacySubmittedReview(
        newLifecycleCtx({ status: 'submitted', placementsCount: 2 }),
      ),
    ).toBe(false)
  })
})

describe('deal status transitions', () => {
  it('allows valid production transitions', () => {
    expect(canTransitionDealStatus('new', 'accepted')).toBe(true)
    expect(canTransitionDealStatus('payment_pending', 'accepted')).toBe(true)
    expect(canTransitionDealStatus('payment_pending', 'cancelled')).toBe(true)
    expect(canTransitionDealStatus('accepted', 'in_progress')).toBe(true)
    expect(canTransitionDealStatus('in_progress', 'submitted')).toBe(true)
    expect(canTransitionDealStatus('submitted', 'completed')).toBe(true)
    expect(canTransitionDealStatus('submitted', 'in_progress')).toBe(true)
    expect(canTransitionDealStatus('submitted', 'disputed')).toBe(true)
    expect(canTransitionDealStatus('disputed', 'resolved_creator')).toBe(true)
    expect(canTransitionDealStatus('disputed', 'resolved_advertiser')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(canTransitionDealStatus('completed', 'in_progress')).toBe(false)
    expect(canTransitionDealStatus('rejected', 'accepted')).toBe(false)
    expect(canTransitionDealStatus('cancelled', 'accepted')).toBe(false)
    expect(canTransitionDealStatus('new', 'completed')).toBe(false)
  })

  it('assertDealStatusTransition throws on invalid transition', () => {
    expect(() => assertDealStatusTransition('completed', 'submitted')).toThrow(
      'Invalid deal status transition',
    )
  })

  it('treats replied as in_progress for transition checks', () => {
    expect(canTransitionDealStatus('replied', 'submitted')).toBe(true)
  })
})

describe('terminal deal statuses', () => {
  it('marks completed, cancelled, rejected as terminal', () => {
    expect(isTerminalDealStatus('completed')).toBe(true)
    expect(isTerminalDealStatus('cancelled')).toBe(true)
    expect(isTerminalDealStatus('rejected')).toBe(true)
  })

  it('does not mark active or resolved statuses as terminal', () => {
    expect(isTerminalDealStatus('submitted')).toBe(false)
    expect(isTerminalDealStatus('resolved_creator')).toBe(false)
    expect(isTerminalDealStatus('resolved_advertiser')).toBe(false)
  })

  it('terminal statuses have no outgoing transitions', () => {
    expect(canTransitionDealStatus('completed', 'submitted')).toBe(false)
    expect(canTransitionDealStatus('cancelled', 'accepted')).toBe(false)
    expect(canTransitionDealStatus('rejected', 'new')).toBe(false)
  })
})

describe('terms sequence', () => {
  it('follows none -> proposed -> accepted -> locked', () => {
    expect(canTransitionTermsStatus('none', 'proposed')).toBe(true)
    expect(canTransitionTermsStatus('proposed', 'accepted')).toBe(true)
    expect(canTransitionTermsStatus('accepted', 'locked')).toBe(true)
    expect(canTransitionTermsStatus('locked', 'proposed')).toBe(false)
  })

  it('allows counter-proposal while proposed', () => {
    expect(canTransitionTermsStatus('proposed', 'proposed')).toBe(true)
  })

  it('canProposeTerms when none or proposed and not locked', () => {
    expect(canProposeTerms(baseCtx({ termsStatus: 'none' }))).toBe(true)
    expect(canProposeTerms(baseCtx({ termsStatus: 'proposed' }))).toBe(true)
    expect(canProposeTerms(baseCtx({ termsStatus: 'locked' }))).toBe(false)
    expect(canProposeTerms(baseCtx({ termsStatus: 'accepted', termsLockedAt: '2026-01-01' }))).toBe(
      false,
    )
  })

  it('canAcceptTerms only when proposed', () => {
    expect(canAcceptTerms(baseCtx({ termsStatus: 'proposed' }))).toBe(true)
    expect(canAcceptTerms(baseCtx({ termsStatus: 'none' }))).toBe(false)
  })

  it('canLockTerms only when accepted and not yet locked', () => {
    expect(canLockTerms(baseCtx({ termsStatus: 'accepted' }))).toBe(true)
    expect(canLockTerms(baseCtx({ termsStatus: 'proposed' }))).toBe(false)
    expect(canLockTerms(baseCtx({ termsStatus: 'accepted', termsLockedAt: '2026-01-01' }))).toBe(
      false,
    )
  })
})

describe('creator content workflow', () => {
  it('advertiser_provides keeps content not_required', () => {
    const ctx = baseCtx({
      contentMode: 'advertiser_provides',
      contentStatus: 'not_required',
    })
    expect(isCreatorContentReady(ctx)).toBe(true)
    expect(canSubmitCreatorContent(ctx)).toBe(false)
    expect(canApproveCreatorContent(ctx)).toBe(false)
  })

  it('creator_creates flow: pending -> submitted -> approved', () => {
    const pending = baseCtx({ contentMode: 'creator_creates', contentStatus: 'pending' })
    expect(canSubmitCreatorContent(pending)).toBe(true)
    expect(isCreatorContentReady(pending)).toBe(false)

    const submitted = baseCtx({ contentMode: 'creator_creates', contentStatus: 'submitted' })
    expect(canApproveCreatorContent(submitted)).toBe(true)
    expect(canRequestContentChanges(submitted)).toBe(true)

    const approved = baseCtx({ contentMode: 'creator_creates', contentStatus: 'approved' })
    expect(isCreatorContentReady(approved)).toBe(true)
  })

  it('creator_creates revision loop', () => {
    const changes = baseCtx({ contentMode: 'creator_creates', contentStatus: 'changes_requested' })
    expect(canSubmitCreatorContent(changes)).toBe(true)
    expect(canApproveCreatorContent(changes)).toBe(false)
  })
})

describe('placement workflow', () => {
  it('scheduled -> awaiting_publication -> published', () => {
    expect(canTransitionPlacementStatus('scheduled', 'awaiting_publication')).toBe(true)
    expect(canTransitionPlacementStatus('awaiting_publication', 'published')).toBe(true)
    expect(canTransitionPlacementStatus('published', 'issue_reported')).toBe(true)
  })

  it('does not support per-placement advertiser approval', () => {
    expect(supportsPerPlacementAdvertiserApproval()).toBe(false)
  })

  it('canPublishPlacement when terms accepted and content ready', () => {
    const ctx = newLifecycleCtx({
      status: 'in_progress',
      termsStatus: 'accepted',
      termsLockedAt: null,
      contentMode: 'creator_creates',
      contentStatus: 'approved',
    })
    expect(canPublishPlacement(ctx, 1)).toBe(true)
    expect(canPublishPlacement(ctx, 99)).toBe(false)
  })

  it('blocks publish when creator content not approved', () => {
    const ctx = newLifecycleCtx({
      status: 'in_progress',
      termsStatus: 'accepted',
      termsLockedAt: null,
      contentMode: 'creator_creates',
      contentStatus: 'pending',
      placementsCount: 1,
      placements: placements([1, 'scheduled']),
    })
    expect(canPublishPlacement(ctx, 1)).toBe(false)
  })

  it('canReportPlacementIssue only on published placements', () => {
    const ctx = baseCtx({
      placementsCount: 1,
      placements: placements([1, 'published']),
    })
    expect(isLegacyLifecycleDeal(ctx)).toBe(false)
    expect(canReportPlacementIssue(ctx, 1)).toBe(true)
    expect(canReportPlacementIssue(ctx, 2)).toBe(false)
  })
})

describe('all placements published & final review', () => {
  it('new lifecycle deal with incomplete placements cannot start final review', () => {
    const ctx = newLifecycleCtx({
      placements: placements([1, 'published'], [2, 'scheduled']),
    })
    expect(isAllPlacementsPublished(ctx)).toBe(false)
    expect(canStartFinalReview(ctx)).toBe(false)
  })

  it('is false until N/N published', () => {
    const ctx = newLifecycleCtx({
      placementsCount: 4,
      placements: placements(
        [1, 'published'],
        [2, 'published'],
        [3, 'scheduled'],
        [4, 'scheduled'],
      ),
    })
    expect(countPublishedPlacements(ctx)).toBe(2)
    expect(isAllPlacementsPublished(ctx)).toBe(false)
    expect(canStartFinalReview(ctx)).toBe(false)
  })

  it('N/N published allows final review when other requirements pass', () => {
    const ctx = newLifecycleCtx({
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(canStartFinalReview(ctx)).toBe(true)
  })

  it('creator_creates cannot start final review with unapproved content', () => {
    const ctx = newLifecycleCtx({
      contentMode: 'creator_creates',
      contentStatus: 'submitted',
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(canStartFinalReview(ctx)).toBe(false)
  })

  it('creator_creates N/N with approved content can start final review', () => {
    const ctx = newLifecycleCtx({
      contentMode: 'creator_creates',
      contentStatus: 'approved',
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(canStartFinalReview(ctx)).toBe(true)
  })

  it('advertiser_provides does not require creator content approval', () => {
    const ctx = newLifecycleCtx({
      contentMode: 'advertiser_provides',
      contentStatus: 'not_required',
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(isCreatorContentReady(ctx)).toBe(true)
    expect(canStartFinalReview(ctx)).toBe(true)
  })

  it('final review is ONE stage after N/N — not per placement', () => {
    const ctx = newLifecycleCtx({
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(canStartFinalReview(ctx)).toBe(true)
    expect(isInFinalReview(ctx)).toBe(false)
    const inReview = { ...ctx, finalReviewStartedAt: '2026-03-01T12:00:00Z' }
    expect(isInFinalReview(inReview)).toBe(true)
    expect(supportsPerPlacementAdvertiserApproval()).toBe(false)
  })

  it('legacy deals cannot use canStartFinalReview', () => {
    expect(canStartFinalReview(baseCtx({ status: 'submitted' }))).toBe(false)
  })
})

describe('completion readiness & legacy bypass hardening', () => {
  it('genuine legacy submitted deal can complete through compatibility path', () => {
    const legacy = baseCtx({ status: 'submitted' })
    expect(isLegacySubmittedReview(legacy)).toBe(true)
    expect(canCompleteDeal(legacy)).toBe(true)
    expect(isDealCompletionReady(legacy)).toBe(true)
  })

  it('new lifecycle submitted deal cannot use legacy bypass', () => {
    const modern = newLifecycleCtx({
      status: 'submitted',
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(isLegacySubmittedReview(modern)).toBe(false)
    expect(canCompleteDeal(modern)).toBe(false)
    expect(isDealCompletionReady(modern)).toBe(false)
  })

  it('new lifecycle deal completes only through final review path', () => {
    const ready = newLifecycleCtx({
      status: 'in_progress',
      finalReviewStartedAt: '2026-03-01T12:00:00Z',
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(isNewLifecycleCompletionReady(ready)).toBe(true)
    expect(canCompleteDeal(ready)).toBe(true)
    expect(isDealCompletionReady(ready)).toBe(true)
  })

  it('issue_reported blocks completion readiness', () => {
    const ctx = newLifecycleCtx({
      status: 'in_progress',
      finalReviewStartedAt: '2026-02-01T12:00:00Z',
      placements: placements([1, 'published'], [2, 'issue_reported']),
    })
    expect(isAllPlacementsPublished(ctx)).toBe(true)
    expect(isDealCompletionReady(ctx)).toBe(false)
    expect(canCompleteDeal(ctx)).toBe(false)
  })

  it('resolved_creator allows completion (dispute → creator wins → future RELEASE)', () => {
    expect(canCompleteDeal(baseCtx({ status: 'resolved_creator' }))).toBe(true)
    expect(getTargetFinancialOutcome(baseCtx({ status: 'resolved_creator' }))).toBe(
      'release_to_creator',
    )
  })

  it('resolved_advertiser does not complete successfully (refund path)', () => {
    expect(canCompleteDeal(baseCtx({ status: 'resolved_advertiser' }))).toBe(false)
    expect(getTargetFinancialOutcome(baseCtx({ status: 'resolved_advertiser' }))).toBe(
      'refund_to_advertiser',
    )
  })

  it('does not complete from in_progress without final review', () => {
    const ctx = newLifecycleCtx({
      status: 'in_progress',
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(canCompleteDeal(ctx)).toBe(false)
  })
})

describe('auto-complete deadline (48h from final review)', () => {
  it('computes deadline as finalReviewStartedAt + 48 hours', () => {
    const start = new Date('2026-03-01T12:00:00Z')
    const deadline = computeAutoCompleteDeadline(start)
    expect(deadline.getTime() - start.getTime()).toBe(
      FINAL_REVIEW_AUTO_COMPLETE_HOURS * 60 * 60 * 1000,
    )
  })

  it('is eligible only after autoCompleteDeadline from final review, not submitted time', () => {
    const finalReviewStartedAt = '2026-03-01T12:00:00Z'
    const deadline = computeAutoCompleteDeadline(finalReviewStartedAt).toISOString()
    const ctx = newLifecycleCtx({
      status: 'in_progress',
      finalReviewStartedAt,
      autoCompleteDeadline: deadline,
      placements: placements([1, 'published'], [2, 'published']),
    })

    expect(
      isAutoCompleteEligible(ctx, new Date('2026-03-02T12:00:00Z')),
    ).toBe(false)
    expect(
      isAutoCompleteEligible(ctx, new Date('2026-03-03T13:00:00Z')),
    ).toBe(true)
  })

  it('is not eligible without finalReviewStartedAt on new lifecycle deals', () => {
    const ctx = newLifecycleCtx({
      autoCompleteDeadline: '2026-03-03T13:00:00Z',
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(isAutoCompleteEligible(ctx, new Date('2026-03-04T00:00:00Z'))).toBe(false)
  })

  it('legacy deals are not eligible via new 48h auto-complete helper', () => {
    const legacy = baseCtx({
      status: 'submitted',
      autoCompleteDeadline: '2026-03-03T13:00:00Z',
    })
    expect(isAutoCompleteEligible(legacy, new Date('2026-03-04T00:00:00Z'))).toBe(false)
  })
})

describe('disputes', () => {
  it('unresolved dispute blocks normal completion', () => {
    const ctx = newLifecycleCtx({
      status: 'disputed',
      finalReviewStartedAt: '2026-03-01T12:00:00Z',
      placements: placements([1, 'published'], [2, 'published']),
    })
    expect(canStartFinalReview(ctx)).toBe(false)
    expect(canCompleteDeal(ctx)).toBe(false)
    expect(isDealCompletionReady(ctx)).toBe(false)
    expect(getTargetFinancialOutcome(ctx)).toBe('held_during_dispute')
  })
})

describe('financial architecture (types only, no fake payment)', () => {
  it('does not claim funds are held for legacy deals', () => {
    expect(getTargetFinancialOutcome(baseCtx({ status: 'submitted' }))).toBe('not_applicable')
  })

  it('signals awaiting_hold for locked new lifecycle terms without pretending payment', () => {
    expect(getTargetFinancialOutcome(newLifecycleCtx())).toBe('awaiting_hold')
  })
})
