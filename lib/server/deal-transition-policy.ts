import {
  assertDealStatusTransition,
  normalizeDealStatus,
  type DealStatus,
} from '@/lib/deal-lifecycle'
import type { DealParticipantRole } from '@/lib/server/deal-auth'
import { DealActionError } from '@/lib/server/deal-errors'

/** Transitions that MUST use dedicated endpoints — never generic /transition. */
export const SPECIALIZED_TRANSITION_TARGETS = new Set<DealStatus>([
  'completed',
  'disputed',
  'resolved_creator',
  'resolved_advertiser',
])

/** Generic POST /api/deals/[id]/transition — creator role. */
export const GENERIC_CREATOR_TRANSITIONS: Partial<Record<DealStatus, readonly DealStatus[]>> = {
  payment_pending: ['accepted', 'cancelled'],
  accepted: ['in_progress'],
  in_progress: ['submitted'],
}

/** Generic POST /api/deals/[id]/transition — advertiser role. */
export const GENERIC_ADVERTISER_TRANSITIONS: Partial<Record<DealStatus, readonly DealStatus[]>> = {
  new: ['accepted', 'rejected'],
  payment_pending: ['cancelled'],
}

/** Admin dispute resolution — POST /api/deals/[id]/admin/resolve only. */
export const ADMIN_RESOLVE_TRANSITIONS: Partial<Record<DealStatus, readonly DealStatus[]>> = {
  disputed: ['resolved_creator', 'resolved_advertiser'],
}

export const GENERIC_TRANSITION_BODY_KEYS = new Set([
  'toStatus',
  'postsCount',
  'proofLinks',
  'creatorNote',
  'paymentStatus',
])

export type GenericTransitionPayload = {
  toStatus: DealStatus
  postsCount?: number
  proofLinks?: string[]
  creatorNote?: string
  paymentStatus?: string
}

export function parseGenericTransitionBody(body: unknown): GenericTransitionPayload {
  if (!body || typeof body !== 'object') {
    throw new DealActionError('Invalid body', 400)
  }

  const record = body as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!GENERIC_TRANSITION_BODY_KEYS.has(key)) {
      throw new DealActionError(`Unexpected field: ${key}`, 400)
    }
  }

  const toStatus = record.toStatus
  if (typeof toStatus !== 'string') {
    throw new DealActionError('toStatus required', 400)
  }

  const payload: GenericTransitionPayload = { toStatus: toStatus as DealStatus }

  if (record.postsCount != null) {
    if (typeof record.postsCount !== 'number') throw new DealActionError('Invalid postsCount', 400)
    payload.postsCount = record.postsCount
  }
  if (record.proofLinks != null) {
    if (!Array.isArray(record.proofLinks) || !record.proofLinks.every((v) => typeof v === 'string')) {
      throw new DealActionError('Invalid proofLinks', 400)
    }
    payload.proofLinks = record.proofLinks
  }
  if (record.creatorNote != null) {
    if (typeof record.creatorNote !== 'string') throw new DealActionError('Invalid creatorNote', 400)
    payload.creatorNote = record.creatorNote
  }
  if (record.paymentStatus != null) {
    if (typeof record.paymentStatus !== 'string') throw new DealActionError('Invalid paymentStatus', 400)
    payload.paymentStatus = record.paymentStatus
  }

  return payload
}

export function assertGenericTransitionAllowed(
  role: DealParticipantRole,
  fromStatus: string,
  toStatus: DealStatus,
): void {
  const from = normalizeDealStatus(fromStatus)
  assertDealStatusTransition(from, toStatus)

  if (SPECIALIZED_TRANSITION_TARGETS.has(toStatus)) {
    throw new DealActionError(`Use dedicated endpoint for transition to ${toStatus}`, 403)
  }

  if (from === 'submitted' && toStatus === 'in_progress') {
    throw new DealActionError('Use request-revision endpoint for submitted -> in_progress', 403)
  }

  const map = role === 'creator' ? GENERIC_CREATOR_TRANSITIONS : GENERIC_ADVERTISER_TRANSITIONS
  const allowed = map[from]
  if (!allowed?.includes(toStatus)) {
    throw new DealActionError(`${role} cannot transition ${from} -> ${toStatus}`, 403)
  }
}

export function assertAdminResolveTransition(fromStatus: string, toStatus: DealStatus): void {
  const from = normalizeDealStatus(fromStatus)
  assertDealStatusTransition(from, toStatus)

  const allowed = ADMIN_RESOLVE_TRANSITIONS[from]
  if (!allowed?.includes(toStatus)) {
    throw new DealActionError(`Admin cannot transition ${from} -> ${toStatus}`, 403)
  }
}

export function assertLegacyRevisionTransition(fromStatus: string, toStatus: DealStatus): void {
  const from = normalizeDealStatus(fromStatus)
  assertDealStatusTransition(from, toStatus)
  if (from !== 'submitted' || toStatus !== 'in_progress') {
    throw new DealActionError('Legacy revision only supports submitted -> in_progress', 400)
  }
}

export function assertDisputeTransition(fromStatus: string, toStatus: DealStatus): void {
  const from = normalizeDealStatus(fromStatus)
  assertDealStatusTransition(from, toStatus)
  if (toStatus !== 'disputed') {
    throw new DealActionError('Invalid dispute transition', 400)
  }
}
