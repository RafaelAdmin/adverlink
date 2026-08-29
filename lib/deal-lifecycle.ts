/**
 * Central deal lifecycle rules (Phase 1).
 * Pure functions only — no Supabase, fetch, or side effects.
 *
 * DB status values are preserved as-is; legacy "replied" normalizes on read only.
 *
 * Financial settlement (future — not implemented):
 *   HOLD (after advertiser pays) → single RELEASE on successful completion
 *   HOLD → DISPUTE → admin → RELEASE (creator) or REFUND (advertiser, full/partial)
 *   No per-placement payouts. One final settlement per deal.
 */

// ---------------------------------------------------------------------------
// Status types (Phase 0 DB values)
// ---------------------------------------------------------------------------

export type DealStatus =
  | 'new'
  | 'payment_pending'
  | 'accepted'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'disputed'
  | 'resolved_creator'
  | 'resolved_advertiser'

export type TermsStatus = 'none' | 'proposed' | 'accepted' | 'locked'

export type ContentMode = 'advertiser_provides' | 'creator_creates'

export type ContentStatus =
  | 'not_required'
  | 'pending'
  | 'submitted'
  | 'changes_requested'
  | 'approved'

export type PlacementStatus =
  | 'scheduled'
  | 'awaiting_publication'
  | 'published'
  | 'issue_reported'

/**
 * Future payment settlement outcome (architecture only — no provider integration).
 * TODO(payment): map to provider HOLD / RELEASE / REFUND operations.
 */
export type DealFinancialOutcome =
  | 'not_applicable'
  | 'awaiting_hold'
  | 'held'
  | 'held_during_dispute'
  | 'release_to_creator'
  | 'refund_to_advertiser'

/** Fixed product rule: auto-complete window after final review starts. */
export const FINAL_REVIEW_AUTO_COMPLETE_HOURS = 48

// ---------------------------------------------------------------------------
// Context (minimal fields for pure rules; null = unset Phase 0 column)
// ---------------------------------------------------------------------------

export type DealPlacementSnapshot = {
  placementIndex: number
  status: PlacementStatus
}

export type DealLifecycleContext = {
  status: DealStatus | string
  termsStatus: TermsStatus
  contentMode: ContentMode | null
  contentStatus: ContentStatus
  placementsCount: number | null
  placements: DealPlacementSnapshot[]
  allPlacementsPublishedAt: string | null
  finalReviewStartedAt: string | null
  autoCompleteDeadline: string | null
  /** When commercial terms became immutable (Phase 0 column). */
  termsLockedAt?: string | null
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const DEAL_STATUSES: readonly DealStatus[] = [
  'new',
  'payment_pending',
  'accepted',
  'in_progress',
  'submitted',
  'completed',
  'rejected',
  'cancelled',
  'disputed',
  'resolved_creator',
  'resolved_advertiser',
] as const

export function normalizeDealStatus(status: string): DealStatus {
  if (status === 'replied') return 'in_progress'
  if ((DEAL_STATUSES as readonly string[]).includes(status)) {
    return status as DealStatus
  }
  return 'new'
}

// ---------------------------------------------------------------------------
// Legacy vs new lifecycle detection
// ---------------------------------------------------------------------------

/**
 * True when any Phase 0 lifecycle column / placement row indicates the new model.
 * A deal with status `submitted` but lifecycle signals is NOT legacy.
 */
export function hasLifecyclePhase0Signals(ctx: DealLifecycleContext): boolean {
  if (ctx.contentMode != null) return true
  if (ctx.placementsCount != null) return true
  if (ctx.finalReviewStartedAt != null) return true
  if (ctx.allPlacementsPublishedAt != null) return true
  if (ctx.autoCompleteDeadline != null) return true
  if (ctx.termsLockedAt != null && ctx.termsLockedAt !== '') return true
  if (ctx.termsStatus !== 'none') return true
  if (ctx.placements.length > 0) return true
  if (ctx.contentStatus !== 'not_required') return true
  return false
}

/**
 * Genuine pre-lifecycle deal: no meaningful Phase 0 sub-state was ever written.
 * All conditions must hold simultaneously.
 */
export function isLegacyLifecycleDeal(ctx: DealLifecycleContext): boolean {
  return !hasLifecyclePhase0Signals(ctx)
}

export function isNewLifecycleDeal(ctx: DealLifecycleContext): boolean {
  return hasLifecyclePhase0Signals(ctx)
}

// ---------------------------------------------------------------------------
// High-level deal status transitions (production-compatible baseline)
// ---------------------------------------------------------------------------

/**
 * Allowed transitions on ad_requests.status.
 * Includes all transitions observed in current production code.
 */
export const DEAL_STATUS_TRANSITIONS: Readonly<Record<DealStatus, readonly DealStatus[]>> = {
  new: ['accepted', 'rejected', 'cancelled'],
  payment_pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['in_progress', 'cancelled', 'disputed'],
  in_progress: ['submitted', 'cancelled', 'disputed'],
  submitted: ['completed', 'in_progress', 'disputed'],
  disputed: ['resolved_creator', 'resolved_advertiser'],
  resolved_creator: ['completed'],
  resolved_advertiser: ['cancelled'],
  completed: [],
  cancelled: [],
  rejected: [],
}

const TERMINAL_DEAL_STATUSES: ReadonlySet<DealStatus> = new Set([
  'completed',
  'cancelled',
  'rejected',
])

export function isTerminalDealStatus(status: DealStatus | string): boolean {
  return TERMINAL_DEAL_STATUSES.has(normalizeDealStatus(status))
}

export function canTransitionDealStatus(from: DealStatus | string, to: DealStatus | string): boolean {
  const fromNorm = normalizeDealStatus(from)
  const toNorm = normalizeDealStatus(to)
  if (fromNorm === toNorm) return true
  return (DEAL_STATUS_TRANSITIONS[fromNorm] as readonly string[]).includes(toNorm)
}

export function assertDealStatusTransition(from: DealStatus | string, to: DealStatus | string): void {
  if (!canTransitionDealStatus(from, to)) {
    throw new Error(`Invalid deal status transition: ${normalizeDealStatus(from)} -> ${normalizeDealStatus(to)}`)
  }
}

// ---------------------------------------------------------------------------
// Orthogonal sub-state transitions
// ---------------------------------------------------------------------------

export const TERMS_STATUS_TRANSITIONS: Readonly<Record<TermsStatus, readonly TermsStatus[]>> = {
  none: ['proposed'],
  proposed: ['accepted', 'proposed'],
  accepted: ['locked'],
  locked: [],
}

export const PLACEMENT_STATUS_TRANSITIONS: Readonly<
  Record<PlacementStatus, readonly PlacementStatus[]>
> = {
  scheduled: ['awaiting_publication', 'published'],
  awaiting_publication: ['published', 'scheduled'],
  published: ['issue_reported'],
  issue_reported: [],
}

export function canTransitionTermsStatus(from: TermsStatus, to: TermsStatus): boolean {
  if (from === to) return true
  return (TERMS_STATUS_TRANSITIONS[from] as readonly string[]).includes(to)
}

export function canTransitionPlacementStatus(
  from: PlacementStatus,
  to: PlacementStatus,
): boolean {
  if (from === to) return true
  return (PLACEMENT_STATUS_TRANSITIONS[from] as readonly string[]).includes(to)
}

// ---------------------------------------------------------------------------
// Final terms helpers
// ---------------------------------------------------------------------------

export function canProposeTerms(ctx: DealLifecycleContext): boolean {
  if (ctx.termsLockedAt) return false
  if (ctx.termsStatus === 'locked') return false
  return ctx.termsStatus === 'none' || ctx.termsStatus === 'proposed'
}

export function canAcceptTerms(ctx: DealLifecycleContext): boolean {
  if (ctx.termsLockedAt) return false
  return ctx.termsStatus === 'proposed'
}

/** Lock agreed terms. TODO(payment): trigger HOLD after lock + advertiser payment. */
export function canLockTerms(ctx: DealLifecycleContext): boolean {
  if (ctx.termsLockedAt) return false
  return ctx.termsStatus === 'accepted'
}

export function areTermsLocked(ctx: DealLifecycleContext): boolean {
  return ctx.termsStatus === 'locked' || !!ctx.termsLockedAt
}

export function areTermsReadyForExecution(ctx: DealLifecycleContext): boolean {
  // TODO(payment): require successful HOLD before creator execution
  return areTermsLocked(ctx) || ctx.termsStatus === 'accepted'
}

// ---------------------------------------------------------------------------
// Creator content helpers
// ---------------------------------------------------------------------------

export function isCreatorContentRequired(ctx: DealLifecycleContext): boolean {
  return ctx.contentMode === 'creator_creates'
}

export function isCreatorContentReady(ctx: DealLifecycleContext): boolean {
  if (ctx.contentMode === 'advertiser_provides') {
    return ctx.contentStatus === 'not_required'
  }
  if (ctx.contentMode === 'creator_creates') {
    return ctx.contentStatus === 'approved'
  }
  // Legacy deals without content_mode — no creator approval gate
  return true
}

export function canSubmitCreatorContent(ctx: DealLifecycleContext): boolean {
  if (ctx.contentMode !== 'creator_creates') return false
  return ctx.contentStatus === 'pending' || ctx.contentStatus === 'changes_requested'
}

export function canRequestContentChanges(ctx: DealLifecycleContext): boolean {
  if (ctx.contentMode !== 'creator_creates') return false
  return ctx.contentStatus === 'submitted'
}

export function canApproveCreatorContent(ctx: DealLifecycleContext): boolean {
  if (ctx.contentMode !== 'creator_creates') return false
  return ctx.contentStatus === 'submitted'
}

// ---------------------------------------------------------------------------
// Placement helpers (execution / proof / analytics — not financial gates)
// ---------------------------------------------------------------------------

export function getExpectedPlacementsCount(ctx: DealLifecycleContext): number {
  if (ctx.placementsCount != null && ctx.placementsCount >= 1) {
    return ctx.placementsCount
  }
  return ctx.placements.length
}

export function countPublishedPlacements(ctx: DealLifecycleContext): number {
  return ctx.placements.filter(
    (p) => p.status === 'published' || p.status === 'issue_reported',
  ).length
}

export function isAllPlacementsPublished(ctx: DealLifecycleContext): boolean {
  const expected = getExpectedPlacementsCount(ctx)
  if (expected < 1) return false
  return countPublishedPlacements(ctx) >= expected
}

/** Open placement issue — blocks successful completion, may escalate to deal dispute. */
export function hasUnresolvedPlacementIssues(ctx: DealLifecycleContext): boolean {
  return ctx.placements.some((p) => p.status === 'issue_reported')
}

export function findPlacement(
  ctx: DealLifecycleContext,
  placementIndex: number,
): DealPlacementSnapshot | undefined {
  return ctx.placements.find((p) => p.placementIndex === placementIndex)
}

export function canPublishPlacement(ctx: DealLifecycleContext, placementIndex: number): boolean {
  const placement = findPlacement(ctx, placementIndex)
  if (!placement) return false
  if (!canTransitionPlacementStatus(placement.status, 'published')) return false
  if (!areTermsReadyForExecution(ctx)) return false
  if (!isCreatorContentReady(ctx)) return false

  const dealStatus = normalizeDealStatus(ctx.status)
  if (!['accepted', 'in_progress'].includes(dealStatus)) {
    return false
  }

  return placement.status === 'scheduled' || placement.status === 'awaiting_publication'
}

/** Advertiser reports a problem — not per-placement approval. */
export function canReportPlacementIssue(ctx: DealLifecycleContext, placementIndex: number): boolean {
  const placement = findPlacement(ctx, placementIndex)
  if (!placement) return false
  return placement.status === 'published'
}

/** No per-placement advertiser approval exists in the product model. */
export function supportsPerPlacementAdvertiserApproval(): boolean {
  return false
}

// ---------------------------------------------------------------------------
// Final review (ONE review after N/N placements — not per placement)
// ---------------------------------------------------------------------------

/**
 * Legacy production path: bulk proof submit → submitted, with no Phase 0 data.
 * Must NOT apply to new lifecycle deals that happen to reuse status `submitted`.
 */
export function isLegacySubmittedReview(ctx: DealLifecycleContext): boolean {
  return normalizeDealStatus(ctx.status) === 'submitted' && isLegacyLifecycleDeal(ctx)
}

/** Phase 2 sets autoCompleteDeadline = finalReviewStartedAt + 48 hours. */
export function computeAutoCompleteDeadline(finalReviewStartedAt: string | Date): Date {
  const start =
    typeof finalReviewStartedAt === 'string'
      ? new Date(finalReviewStartedAt)
      : finalReviewStartedAt
  return new Date(start.getTime() + FINAL_REVIEW_AUTO_COMPLETE_HOURS * 60 * 60 * 1000)
}

/**
 * Prerequisites to enter final review (before finalReviewStartedAt is written).
 * Does not require payment HOLD yet — TODO(payment) in Phase 2+.
 */
export function canStartFinalReview(ctx: DealLifecycleContext): boolean {
  if (isLegacyLifecycleDeal(ctx)) return false
  if (!isNewLifecycleDeal(ctx)) return false
  if (normalizeDealStatus(ctx.status) === 'disputed') return false
  if (!isAllPlacementsPublished(ctx)) return false
  if (!isCreatorContentReady(ctx)) return false
  if (!areTermsReadyForExecution(ctx)) return false
  return true
}

export function isInFinalReview(ctx: DealLifecycleContext): boolean {
  if (isLegacySubmittedReview(ctx)) return true
  return ctx.finalReviewStartedAt != null
}

/**
 * Auto-complete eligibility for new lifecycle deals uses autoCompleteDeadline
 * derived from finalReviewStartedAt (+48h), NOT submitted/updated_at.
 * Legacy cron behavior remains outside this module until Phase 2 migration.
 */
export function isAutoCompleteEligible(ctx: DealLifecycleContext, now: Date = new Date()): boolean {
  if (!ctx.autoCompleteDeadline) return false
  if (normalizeDealStatus(ctx.status) === 'disputed') return false
  if (hasUnresolvedPlacementIssues(ctx)) return false

  if (isLegacyLifecycleDeal(ctx)) {
    // Legacy cron uses updated_at — not modeled here; do not treat as new 48h rule
    return false
  }

  if (ctx.finalReviewStartedAt == null) return false
  if (!isAllPlacementsPublished(ctx)) return false
  if (!isCreatorContentReady(ctx)) return false
  if (!areTermsReadyForExecution(ctx)) return false

  return now.getTime() >= new Date(ctx.autoCompleteDeadline).getTime()
}

/** New lifecycle: all gates for manual confirm or future auto-complete / RELEASE. */
export function isNewLifecycleCompletionReady(ctx: DealLifecycleContext): boolean {
  if (!isNewLifecycleDeal(ctx)) return false
  if (ctx.finalReviewStartedAt == null) return false
  if (!isAllPlacementsPublished(ctx)) return false
  if (!isCreatorContentReady(ctx)) return false
  if (!areTermsReadyForExecution(ctx)) return false
  if (hasUnresolvedPlacementIssues(ctx)) return false
  if (normalizeDealStatus(ctx.status) === 'disputed') return false
  return true
}

/**
 * Successful deal completion readiness.
 * Legacy: submitted + no Phase 0 signals (current production).
 * New: final review started + N/N + content/terms satisfied.
 * Dispute blocks normal completion. resolved_creator → future RELEASE path.
 */
export function canCompleteDeal(ctx: DealLifecycleContext): boolean {
  const status = normalizeDealStatus(ctx.status)

  if (status === 'disputed' || hasUnresolvedPlacementIssues(ctx)) {
    return false
  }

  if (isLegacySubmittedReview(ctx)) {
    return true
  }

  // TODO(payment): RELEASE after resolved_creator
  if (status === 'resolved_creator') {
    return true
  }

  // resolved_advertiser → refund/cancel path, not successful completion
  if (status === 'resolved_advertiser') {
    return false
  }

  return isNewLifecycleCompletionReady(ctx)
}

export function isDealCompletionReady(ctx: DealLifecycleContext): boolean {
  if (hasUnresolvedPlacementIssues(ctx)) return false
  if (normalizeDealStatus(ctx.status) === 'disputed') return false

  if (isLegacySubmittedReview(ctx)) {
    return true
  }

  return isNewLifecycleCompletionReady(ctx)
}

/**
 * Architecture-only: intended financial outcome for a deal state.
 * Does NOT perform or simulate payment operations.
 */
export function getTargetFinancialOutcome(ctx: DealLifecycleContext): DealFinancialOutcome {
  const status = normalizeDealStatus(ctx.status)

  if (status === 'disputed') return 'held_during_dispute'
  if (status === 'resolved_advertiser') return 'refund_to_advertiser'
  if (status === 'completed' || status === 'resolved_creator') return 'release_to_creator'

  if (isLegacyLifecycleDeal(ctx)) return 'not_applicable'

  if (areTermsLocked(ctx)) {
    // TODO(payment): return 'held' once provider integration exists
    return 'awaiting_hold'
  }

  return 'not_applicable'
}
