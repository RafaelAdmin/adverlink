import {
  canAcceptTerms,
  canApproveCreatorContent,
  canCompleteDeal,
  canLockTerms,
  canProposeTerms,
  canPublishPlacement,
  canReportPlacementIssue,
  canResolvePlacementIssue,
  canRequestContentChanges,
  canStartFinalReview,
  canSubmitCreatorContent,
  computeAutoCompleteDeadline,
  isAllPlacementsPublished,
  isDealCompletionReady,
  isLegacyLifecycleDeal,
  isNewLifecycleDeal,
  normalizeDealStatus,
  type ContentMode,
  type DealStatus,
} from '@/lib/deal-lifecycle'
import { incrementCampaignSlots } from '@/lib/campaigns'
import type { DealParticipantRole } from '@/lib/server/deal-auth'
import { DealActionError } from '@/lib/server/deal-errors'
import {
  assertAdminResolveTransition,
  assertDisputeTransition,
  assertGenericTransitionAllowed,
  assertLegacyRevisionTransition,
  type GenericTransitionPayload,
} from '@/lib/server/deal-transition-policy'
import {
  getAdminClient,
  reloadDealBundle,
  type PlacementRecord,
} from '@/lib/server/deal-repository'
import { associateTelegramProof } from '@/lib/server/telegram-deal-proof'

export const SUPPORTED_DEAL_CURRENCIES = ['USD', 'EUR', 'AMD', 'GEL', 'RUB'] as const

const PUBLISHABLE_PLACEMENT_STATUSES = ['scheduled', 'awaiting_publication'] as const

export type { GenericTransitionPayload }
export type TransitionPayload = GenericTransitionPayload

export {
  assertGenericTransitionAllowed,
  assertAdminResolveTransition,
  assertLegacyRevisionTransition,
  parseGenericTransitionBody,
  GENERIC_CREATOR_TRANSITIONS,
  GENERIC_ADVERTISER_TRANSITIONS,
  ADMIN_RESOLVE_TRANSITIONS,
  SPECIALIZED_TRANSITION_TARGETS,
} from '@/lib/server/deal-transition-policy'

export function assertTelegramPostNotLinkedElsewhere(
  placements: PlacementRecord[],
  telegramPostId: string,
  placementIndex: number,
): void {
  const conflict = placements.find(
    (p) =>
      p.telegram_post_id === telegramPostId &&
      p.placement_index !== placementIndex &&
      p.status === 'published',
  )
  if (conflict) {
    throw new DealActionError('Telegram post already linked to another placement in this deal', 400)
  }
}

async function conditionalDealUpdate(
  dealId: string,
  update: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: (query: any) => any,
): Promise<boolean> {
  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin.from('ad_requests').update(update).eq('id', dealId)
  query = match(query)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw new DealActionError(error.message, 500)
  return Boolean(data)
}

async function conditionalPlacementUpdate(
  placementId: string,
  update: Record<string, unknown>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: (query: any) => any,
): Promise<boolean> {
  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin.from('deal_placements').update(update).eq('id', placementId)
  query = match(query)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) throw new DealActionError(error.message, 500)
  return Boolean(data)
}

export async function executeGenericDealTransition(
  dealId: string,
  userId: string,
  role: DealParticipantRole,
  payload: GenericTransitionPayload,
) {
  const bundle = await reloadDealBundle(dealId)
  const fromStatus = normalizeDealStatus(bundle.deal.status)

  assertGenericTransitionAllowed(role, fromStatus, payload.toStatus)

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    status: payload.toStatus,
    updated_at: now,
  }

  if (payload.toStatus === 'accepted') {
    update.accepted_at = now
  }

  if (payload.toStatus === 'in_progress' && payload.postsCount != null) {
    if (payload.postsCount < 1) {
      throw new DealActionError('postsCount must be >= 1', 400)
    }
    update.posts_count = payload.postsCount
  }

  if (payload.toStatus === 'submitted') {
    if (!payload.proofLinks?.length) {
      throw new DealActionError('proofLinks required', 400)
    }
    update.proof_links = payload.proofLinks
    update.creator_note = payload.creatorNote?.trim() || null
  }

  if (payload.toStatus === 'cancelled' && payload.paymentStatus) {
    update.payment_status = payload.paymentStatus
  }

  const updated = await conditionalDealUpdate(dealId, update, (q) =>
    q.eq('status', fromStatus),
  )
  if (!updated) {
    throw new DealActionError('Deal state changed; refresh and retry', 409)
  }

  if (payload.toStatus === 'accepted' && bundle.deal.campaign_id) {
    await incrementCampaignSlots(getAdminClient() as never, bundle.deal.campaign_id)
  }

  if (payload.toStatus === 'submitted' && payload.proofLinks?.length) {
    for (const link of payload.proofLinks) {
      if (!link.includes('t.me/') && !link.includes('telegram.me/')) continue
      try {
        await associateTelegramProof({
          dealId,
          postUrl: link,
          userId,
          requireCreator: true,
        })
      } catch {
        /* best-effort legacy association */
      }
    }
  }

  return reloadDealBundle(dealId)
}

export type TermsProposalPayload = {
  contentMode: ContentMode
  placementsCount: number
  placementStartAt?: string | null
  placementEndAt?: string | null
  finalPrice: number
  finalPriceCurrency: string
  finalTerms?: Record<string, unknown> | null
}

export function validateTermsProposalPayload(payload: TermsProposalPayload): void {
  if (payload.placementsCount < 1) {
    throw new DealActionError('placementsCount must be >= 1', 400)
  }
  if (payload.finalPrice < 0) {
    throw new DealActionError('finalPrice must be >= 0', 400)
  }
  if (!SUPPORTED_DEAL_CURRENCIES.includes(payload.finalPriceCurrency as (typeof SUPPORTED_DEAL_CURRENCIES)[number])) {
    throw new DealActionError('Unsupported currency', 400)
  }
  if (payload.placementStartAt && payload.placementEndAt) {
    if (new Date(payload.placementEndAt).getTime() < new Date(payload.placementStartAt).getTime()) {
      throw new DealActionError('placementEndAt must be >= placementStartAt', 400)
    }
  }
}

export function parseTermsProposalBody(body: unknown): TermsProposalPayload {
  if (!body || typeof body !== 'object') {
    throw new DealActionError('Invalid body', 400)
  }
  const record = body as Record<string, unknown>
  const allowed = new Set([
    'contentMode',
    'placementsCount',
    'placementStartAt',
    'placementEndAt',
    'finalPrice',
    'finalPriceCurrency',
    'finalTerms',
  ])
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new DealActionError(`Unexpected field: ${key}`, 400)
    }
  }
  return {
    contentMode: record.contentMode as ContentMode,
    placementsCount: Number(record.placementsCount),
    placementStartAt: record.placementStartAt == null ? null : String(record.placementStartAt),
    placementEndAt: record.placementEndAt == null ? null : String(record.placementEndAt),
    finalPrice: Number(record.finalPrice),
    finalPriceCurrency: String(record.finalPriceCurrency || ''),
    finalTerms:
      record.finalTerms == null
        ? null
        : (record.finalTerms as Record<string, unknown>),
  }
}

export async function proposeFinalTerms(
  dealId: string,
  userId: string,
  payload: TermsProposalPayload,
) {
  validateTermsProposalPayload(payload)
  const bundle = await reloadDealBundle(dealId)
  const lifecycle = bundle.lifecycle

  if (!canProposeTerms(lifecycle)) {
    throw new DealActionError('Cannot propose terms in current state', 400)
  }

  const now = new Date().toISOString()
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('ad_requests')
    .update({
      content_mode: payload.contentMode,
      placements_count: payload.placementsCount,
      placement_start_at: payload.placementStartAt ?? null,
      placement_end_at: payload.placementEndAt ?? null,
      final_price: payload.finalPrice,
      final_price_currency: payload.finalPriceCurrency,
      final_terms: payload.finalTerms ?? null,
      terms_status: 'proposed',
      final_terms_proposed_by: userId,
      final_terms_proposed_at: now,
      final_terms_accepted_at: null,
      content_status: payload.contentMode === 'creator_creates' ? 'pending' : 'not_required',
      updated_at: now,
    })
    .eq('id', dealId)
    .neq('terms_status', 'locked')
    .select('id')
    .maybeSingle()

  if (error) throw new DealActionError(error.message, 500)
  if (!data) {
    throw new DealActionError('Cannot propose terms in current state', 409)
  }
  return reloadDealBundle(dealId)
}

export type TermsAcceptPayload = {
  proposedAt?: string
}

export async function acceptFinalTerms(
  dealId: string,
  userId: string,
  payload: TermsAcceptPayload = {},
) {
  const bundle = await reloadDealBundle(dealId)
  const deal = bundle.deal

  if (!canAcceptTerms(bundle.lifecycle)) {
    throw new DealActionError('Cannot accept terms in current state', 400)
  }

  if (deal.final_terms_proposed_by === userId) {
    throw new DealActionError('Cannot accept your own proposal', 403)
  }

  const proposedBy = deal.final_terms_proposed_by
  const proposedAt = deal.final_terms_proposed_at
  if (!proposedBy || !proposedAt) {
    throw new DealActionError('No active terms proposal', 400)
  }

  if (payload.proposedAt && payload.proposedAt !== proposedAt) {
    throw new DealActionError('Terms proposal is stale; refresh and retry', 409)
  }

  const now = new Date().toISOString()
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('ad_requests')
    .update({
      terms_status: 'accepted',
      final_terms_accepted_at: now,
      updated_at: now,
    })
    .eq('id', dealId)
    .eq('terms_status', 'proposed')
    .eq('final_terms_proposed_by', proposedBy)
    .eq('final_terms_proposed_at', proposedAt)
    .neq('final_terms_proposed_by', userId)
    .select('id')
    .maybeSingle()

  if (error) throw new DealActionError(error.message, 500)
  if (!data) {
    throw new DealActionError('Terms proposal is stale or was replaced; refresh and retry', 409)
  }
  return reloadDealBundle(dealId)
}

export async function initializePlacements(dealId: string) {
  const bundle = await reloadDealBundle(dealId)
  const count = bundle.deal.placements_count
  if (!count || count < 1) {
    throw new DealActionError('placements_count not set on deal', 400)
  }

  if (bundle.placements.length > 0) {
    return bundle
  }

  const admin = getAdminClient()
  const rows = Array.from({ length: count }, (_, i) => ({
    ad_request_id: dealId,
    placement_index: i + 1,
    status: 'scheduled',
    scheduled_at: bundle.deal.placement_start_at,
  }))

  const { error } = await admin.from('deal_placements').insert(rows)
  if (error) throw new DealActionError(error.message, 500)

  return reloadDealBundle(dealId)
}

/**
 * Re-reads authoritative deal state and starts final review exactly once when all
 * prerequisites are satisfied (terms, N/N placements, creator content if required).
 */
export async function tryStartFinalReview(dealId: string) {
  let bundle = await reloadDealBundle(dealId)
  if (bundle.deal.final_review_started_at) return bundle
  if (!canStartFinalReview(bundle.lifecycle)) return bundle

  const now = new Date()
  const nowIso = now.toISOString()

  if (isAllPlacementsPublished(bundle.lifecycle) && !bundle.deal.all_placements_published_at) {
    await conditionalDealUpdate(
      dealId,
      {
        all_placements_published_at: nowIso,
        updated_at: nowIso,
      },
      (q) => q.is('all_placements_published_at', null),
    )
    bundle = await reloadDealBundle(dealId)
    if (bundle.deal.final_review_started_at) return bundle
    if (!canStartFinalReview(bundle.lifecycle)) return bundle
  }

  const deadline = computeAutoCompleteDeadline(now)
  const updated = await conditionalDealUpdate(
    dealId,
    {
      all_placements_published_at: bundle.deal.all_placements_published_at ?? nowIso,
      final_review_started_at: nowIso,
      auto_complete_deadline: deadline.toISOString(),
      updated_at: nowIso,
    },
    (q) => q.is('final_review_started_at', null),
  )

  if (!updated) return reloadDealBundle(dealId)
  return reloadDealBundle(dealId)
}

export async function publishPlacementProof(
  dealId: string,
  userId: string,
  placementIndex: number,
  proofUrl: string,
) {
  const bundle = await reloadDealBundle(dealId)
  const lifecycle = bundle.lifecycle

  if (!canPublishPlacement(lifecycle, placementIndex)) {
    throw new DealActionError('Cannot publish this placement', 400)
  }

  const placement = bundle.placements.find((p) => p.placement_index === placementIndex)
  if (!placement) {
    throw new DealActionError('Placement not found', 404)
  }

  if (placement.status === 'published') {
    return bundle
  }

  let telegramPostId: string | null = null
  let telegramMessageId: number | null = null

  if (proofUrl.includes('t.me/') || proofUrl.includes('telegram.me/')) {
    const assoc = await associateTelegramProof({
      dealId,
      postUrl: proofUrl,
      userId,
      requireCreator: true,
    })
    telegramPostId = assoc.postId
    telegramMessageId = assoc.messageId
    assertTelegramPostNotLinkedElsewhere(bundle.placements, telegramPostId, placementIndex)
  }

  const now = new Date().toISOString()

  const published = await conditionalPlacementUpdate(
    placement.id,
    {
      status: 'published',
      proof_url: proofUrl,
      published_at: now,
      telegram_post_id: telegramPostId,
      telegram_message_id: telegramMessageId,
      updated_at: now,
    },
    (q) => q.in('status', [...PUBLISHABLE_PLACEMENT_STATUSES]),
  )

  if (!published) {
    const refreshed = await reloadDealBundle(dealId)
    const current = refreshed.placements.find((p) => p.placement_index === placementIndex)
    if (current?.status === 'published') {
      return refreshed
    }
    throw new DealActionError('Placement state changed; refresh and retry', 409)
  }

  const refreshed = await reloadDealBundle(dealId)

  if (isAllPlacementsPublished(refreshed.lifecycle)) {
    return tryStartFinalReview(dealId)
  }

  return refreshed
}

export async function resolvePlacementIssue(
  dealId: string,
  userId: string,
  placementIndex: number,
  proofUrl: string,
) {
  const trimmedProof = proofUrl.trim()
  if (!trimmedProof) {
    throw new DealActionError('proofUrl required', 400)
  }

  const bundle = await reloadDealBundle(dealId)
  if (!canResolvePlacementIssue(bundle.lifecycle, placementIndex)) {
    throw new DealActionError('Cannot resolve issue for this placement', 400)
  }

  const placement = bundle.placements.find((p) => p.placement_index === placementIndex)
  if (!placement) {
    throw new DealActionError('Placement not found', 404)
  }

  let telegramPostId: string | null = null
  let telegramMessageId: number | null = null

  if (trimmedProof.includes('t.me/') || trimmedProof.includes('telegram.me/')) {
    const assoc = await associateTelegramProof({
      dealId,
      postUrl: trimmedProof,
      userId,
      requireCreator: true,
    })
    telegramPostId = assoc.postId
    telegramMessageId = assoc.messageId
    assertTelegramPostNotLinkedElsewhere(bundle.placements, telegramPostId, placementIndex)
  }

  const now = new Date().toISOString()
  const resolved = await conditionalPlacementUpdate(
    placement.id,
    {
      status: 'published',
      proof_url: trimmedProof,
      published_at: now,
      telegram_post_id: telegramPostId,
      telegram_message_id: telegramMessageId,
      issue_reported_at: null,
      issue_reported_by: null,
      issue_comment: null,
      updated_at: now,
    },
    (q) => q.eq('status', 'issue_reported'),
  )

  if (!resolved) {
    const refreshed = await reloadDealBundle(dealId)
    const current = refreshed.placements.find((p) => p.placement_index === placementIndex)
    if (current?.status === 'published') {
      return tryStartFinalReview(dealId)
    }
    throw new DealActionError('Placement state changed; refresh and retry', 409)
  }

  return tryStartFinalReview(dealId)
}

export async function reportPlacementIssue(
  dealId: string,
  userId: string,
  placementIndex: number,
  issueComment: string,
) {
  if (!issueComment.trim()) {
    throw new DealActionError('issueComment required', 400)
  }

  const bundle = await reloadDealBundle(dealId)
  if (!canReportPlacementIssue(bundle.lifecycle, placementIndex)) {
    throw new DealActionError('Cannot report issue for this placement', 400)
  }

  const placement = bundle.placements.find((p) => p.placement_index === placementIndex)
  if (!placement) throw new DealActionError('Placement not found', 404)

  const now = new Date().toISOString()
  const updated = await conditionalPlacementUpdate(
    placement.id,
    {
      status: 'issue_reported',
      issue_reported_at: now,
      issue_reported_by: userId,
      issue_comment: issueComment.trim(),
      updated_at: now,
    },
    (q) => q.eq('status', 'published'),
  )

  if (!updated) {
    throw new DealActionError('Placement state changed; refresh and retry', 409)
  }
  return reloadDealBundle(dealId)
}

export async function confirmDealCompletion(dealId: string) {
  const bundle = await reloadDealBundle(dealId)
  if (!canCompleteDeal(bundle.lifecycle)) {
    throw new DealActionError('Deal is not ready for completion', 400)
  }

  const from = normalizeDealStatus(bundle.deal.status)
  if (from === 'disputed' || from === 'completed') {
    throw new DealActionError('Cannot complete deal in current state', 400)
  }

  const now = new Date().toISOString()
  const updated = await conditionalDealUpdate(
    dealId,
    {
      status: 'completed',
      completed_at: now,
      updated_at: now,
    },
    (q) => q.eq('status', from).neq('status', 'completed').neq('status', 'disputed'),
  )

  if (!updated) {
    const latest = await reloadDealBundle(dealId)
    if (normalizeDealStatus(latest.deal.status) === 'completed') {
      return latest
    }
    throw new DealActionError('Deal state changed; refresh and retry', 409)
  }

  // TODO(payment): RELEASE to creator — not implemented
  return reloadDealBundle(dealId)
}

export async function autoCompleteDeal(dealId: string, expectedFromStatus: string): Promise<boolean> {
  const bundle = await reloadDealBundle(dealId)
  const from = normalizeDealStatus(expectedFromStatus)
  const current = normalizeDealStatus(bundle.deal.status)

  if (current === 'disputed' || current === 'completed') {
    return false
  }

  const now = new Date().toISOString()
  const updated = await conditionalDealUpdate(
    dealId,
    {
      status: 'completed',
      completed_at: now,
      auto_completed: true,
      updated_at: now,
    },
    (q) =>
      q
        .eq('status', from)
        .neq('status', 'completed')
        .neq('status', 'disputed'),
  )
  return updated
}

export async function requestDealRevision(dealId: string, advertiserNote: string) {
  if (!advertiserNote.trim()) {
    throw new DealActionError('advertiserNote required', 400)
  }

  const bundle = await reloadDealBundle(dealId)
  const lifecycle = bundle.lifecycle
  const from = normalizeDealStatus(bundle.deal.status)

  if (isLegacyLifecycleDeal(lifecycle) && from === 'submitted') {
    assertLegacyRevisionTransition(from, 'in_progress')

    const now = new Date().toISOString()
    const updated = await conditionalDealUpdate(
      dealId,
      {
        status: 'in_progress',
        advertiser_note: advertiserNote.trim(),
        updated_at: now,
      },
      (q) => q.eq('status', 'submitted'),
    )
    if (!updated) {
      throw new DealActionError('Deal state changed; refresh and retry', 409)
    }
    return reloadDealBundle(dealId)
  }

  if (isNewLifecycleDeal(lifecycle) && bundle.deal.final_review_started_at) {
    throw new DealActionError(
      'Revision after all placements published is not supported for new lifecycle deals. Open a dispute instead.',
      400,
    )
  }

  throw new DealActionError('Revision not available in current state', 400)
}

export async function openDealDispute(dealId: string, reason: string) {
  if (!reason.trim()) throw new DealActionError('reason required', 400)

  const bundle = await reloadDealBundle(dealId)
  const from = normalizeDealStatus(bundle.deal.status)

  assertDisputeTransition(from, 'disputed')

  if (from !== 'submitted' && !bundle.deal.final_review_started_at) {
    throw new DealActionError('Dispute not available in current state', 400)
  }

  const now = new Date().toISOString()
  const updated = await conditionalDealUpdate(
    dealId,
    {
      status: 'disputed',
      dispute_reason: reason.trim(),
      updated_at: now,
    },
    (q) => q.eq('status', from).neq('status', 'disputed').neq('status', 'completed'),
  )

  if (!updated) {
    const latest = await reloadDealBundle(dealId)
    if (normalizeDealStatus(latest.deal.status) === 'disputed') {
      return latest
    }
    throw new DealActionError('Deal state changed; refresh and retry', 409)
  }

  return reloadDealBundle(dealId)
}

export async function resolveDealDispute(
  dealId: string,
  toStatus: 'resolved_creator' | 'resolved_advertiser',
) {
  const bundle = await reloadDealBundle(dealId)
  const from = normalizeDealStatus(bundle.deal.status)
  assertAdminResolveTransition(from, toStatus)

  const now = new Date().toISOString()
  const updated = await conditionalDealUpdate(
    dealId,
    {
      status: toStatus,
      completed_at: now,
      updated_at: now,
    },
    (q) => q.eq('status', 'disputed'),
  )

  if (!updated) {
    throw new DealActionError('Deal is not disputed or was already resolved', 409)
  }
  return reloadDealBundle(dealId)
}

export type MaterialSavePayload = {
  bodyText?: string | null
  destinationUrl?: string | null
  attachments?: unknown[] | null
  creatorSubmissionText?: string | null
}

function assertAllowedFields(body: unknown, allowed: Set<string>) {
  if (!body || typeof body !== 'object') {
    throw new DealActionError('Invalid body', 400)
  }
  for (const key of Object.keys(body as Record<string, unknown>)) {
    if (!allowed.has(key)) {
      throw new DealActionError(`Unexpected field: ${key}`, 400)
    }
  }
}

export function parseAdvertiserContentPayload(body: unknown): Pick<
  MaterialSavePayload,
  'bodyText' | 'destinationUrl'
> {
  assertAllowedFields(body, new Set(['action', 'bodyText', 'destinationUrl']))
  const record = body as Record<string, unknown>
  return {
    bodyText: record.bodyText == null ? null : String(record.bodyText),
    destinationUrl: record.destinationUrl == null ? null : String(record.destinationUrl),
  }
}

export function parseCreatorSubmissionPayload(body: unknown): Pick<
  MaterialSavePayload,
  'creatorSubmissionText'
> {
  assertAllowedFields(body, new Set(['action', 'creatorSubmissionText']))
  const record = body as Record<string, unknown>
  const text = record.creatorSubmissionText == null ? '' : String(record.creatorSubmissionText).trim()
  if (!text) {
    throw new DealActionError('creatorSubmissionText required', 400)
  }
  return { creatorSubmissionText: text }
}

export function parseMaterialSavePayload(body: unknown): MaterialSavePayload {
  assertAllowedFields(
    body,
    new Set([
      'action',
      'bodyText',
      'destinationUrl',
      'attachments',
      'creatorSubmissionText',
      'comment',
    ]),
  )
  const record = body as Record<string, unknown>
  return {
    bodyText: record.bodyText == null ? null : String(record.bodyText),
    destinationUrl: record.destinationUrl == null ? null : String(record.destinationUrl),
    attachments: Array.isArray(record.attachments) ? record.attachments : null,
    creatorSubmissionText:
      record.creatorSubmissionText == null ? null : String(record.creatorSubmissionText),
  }
}

export async function saveAdvertiserMaterial(
  dealId: string,
  payload: Pick<MaterialSavePayload, 'bodyText' | 'destinationUrl'>,
) {
  const bundle = await reloadDealBundle(dealId)
  if (bundle.deal.content_mode !== 'advertiser_provides') {
    throw new DealActionError('Deal is not advertiser_provides mode', 400)
  }

  const bodyText = payload.bodyText?.trim()
  if (!bodyText) {
    throw new DealActionError('bodyText required', 400)
  }

  const admin = getAdminClient()
  const now = new Date().toISOString()
  const row = {
    ad_request_id: dealId,
    body_text: bodyText,
    destination_url: payload.destinationUrl?.trim() || null,
    updated_at: now,
  }

  const existing = bundle.material
  if (existing) {
    const { error } = await admin.from('deal_materials').update(row).eq('id', existing.id)
    if (error) throw new DealActionError(error.message, 500)
  } else {
    const { error } = await admin.from('deal_materials').insert({ ...row, created_at: now })
    if (error) throw new DealActionError(error.message, 500)
  }

  return reloadDealBundle(dealId)
}

export async function saveAdvertiserBrief(
  dealId: string,
  payload: Pick<MaterialSavePayload, 'bodyText' | 'destinationUrl'>,
) {
  const bundle = await reloadDealBundle(dealId)
  if (bundle.deal.content_mode !== 'creator_creates') {
    throw new DealActionError('Deal is not creator_creates mode', 400)
  }

  const status = bundle.deal.content_status
  if (status === 'submitted' || status === 'approved') {
    throw new DealActionError('Cannot edit brief while content is under review or approved', 400)
  }

  const bodyText = payload.bodyText?.trim()
  if (!bodyText) {
    throw new DealActionError('bodyText required', 400)
  }

  const admin = getAdminClient()
  const now = new Date().toISOString()
  const row = {
    ad_request_id: dealId,
    body_text: bodyText,
    destination_url: payload.destinationUrl?.trim() || null,
    updated_at: now,
  }

  const existing = bundle.material
  if (existing) {
    const { error } = await admin.from('deal_materials').update(row).eq('id', existing.id)
    if (error) throw new DealActionError(error.message, 500)
  } else {
    const { error } = await admin.from('deal_materials').insert({ ...row, created_at: now })
    if (error) throw new DealActionError(error.message, 500)
  }

  return reloadDealBundle(dealId)
}

export async function submitCreatorContent(
  dealId: string,
  payload: Pick<MaterialSavePayload, 'creatorSubmissionText'>,
) {
  const bundle = await reloadDealBundle(dealId)
  if (!canSubmitCreatorContent(bundle.lifecycle)) {
    throw new DealActionError('Cannot submit creator content now', 400)
  }

  const submissionText = payload.creatorSubmissionText?.trim()
  if (!submissionText) {
    throw new DealActionError('creatorSubmissionText required', 400)
  }

  const admin = getAdminClient()
  const now = new Date().toISOString()

  const materialRow = {
    ad_request_id: dealId,
    creator_submission_text: submissionText,
    updated_at: now,
  }

  if (bundle.material) {
    await admin.from('deal_materials').update(materialRow).eq('id', bundle.material.id)
  } else {
    await admin.from('deal_materials').insert({ ...materialRow, created_at: now })
  }

  const { error } = await admin
    .from('ad_requests')
    .update({
      content_status: 'submitted',
      content_submitted_at: now,
      updated_at: now,
    })
    .eq('id', dealId)
    .neq('content_status', 'approved')

  if (error) throw new DealActionError(error.message, 500)
  return reloadDealBundle(dealId)
}

export async function approveCreatorContent(dealId: string) {
  const bundle = await reloadDealBundle(dealId)
  if (!canApproveCreatorContent(bundle.lifecycle)) {
    throw new DealActionError('Cannot approve content now', 400)
  }

  const now = new Date().toISOString()
  const admin = getAdminClient()
  const { error } = await admin
    .from('ad_requests')
    .update({
      content_status: 'approved',
      content_approved_at: now,
      updated_at: now,
    })
    .eq('id', dealId)
    .eq('content_status', 'submitted')

  if (error) throw new DealActionError(error.message, 500)
  return tryStartFinalReview(dealId)
}

export async function requestCreatorContentChanges(dealId: string, comment: string) {
  if (!comment.trim()) throw new DealActionError('comment required', 400)

  const bundle = await reloadDealBundle(dealId)
  if (!canRequestContentChanges(bundle.lifecycle)) {
    throw new DealActionError('Cannot request content changes now', 400)
  }

  const now = new Date().toISOString()
  const admin = getAdminClient()

  if (bundle.material) {
    await admin
      .from('deal_materials')
      .update({ change_request_comment: comment.trim(), updated_at: now })
      .eq('id', bundle.material.id)
  }

  const { error } = await admin
    .from('ad_requests')
    .update({
      content_status: 'changes_requested',
      updated_at: now,
    })
    .eq('id', dealId)
    .eq('content_status', 'submitted')

  if (error) throw new DealActionError(error.message, 500)
  return reloadDealBundle(dealId)
}

export function serializeDealResponse(bundle: Awaited<ReturnType<typeof reloadDealBundle>>) {
  return {
    deal: bundle.deal,
    placements: bundle.placements,
    material: bundle.material,
    lifecycle: bundle.lifecycle,
    completionReady: isDealCompletionReady(bundle.lifecycle),
    canLockTerms: canLockTerms(bundle.lifecycle),
  }
}

export function assertClientCannotLockTerms(termsStatus: string): void {
  if (termsStatus === 'locked') {
    throw new DealActionError('Terms locking requires future payment integration', 400)
  }
}

/** @deprecated Use assertGenericTransitionAllowed or specialized policy helpers */
export function assertActorCanTransition(
  role: DealParticipantRole | null,
  isAdmin: boolean,
  fromStatus: string,
  toStatus: DealStatus,
): void {
  if (isAdmin) {
    assertAdminResolveTransition(fromStatus, toStatus)
    return
  }
  if (!role) {
    throw new DealActionError('Forbidden', 403)
  }
  assertGenericTransitionAllowed(role, fromStatus, toStatus)
}

/** @deprecated Use executeGenericDealTransition */
export async function executeDealTransition(
  dealId: string,
  userId: string,
  isAdmin: boolean,
  role: DealParticipantRole | null,
  payload: GenericTransitionPayload,
) {
  if (isAdmin) {
    throw new DealActionError('Admin must use dedicated resolve endpoint', 403)
  }
  if (!role) {
    throw new DealActionError('Forbidden', 403)
  }
  return executeGenericDealTransition(dealId, userId, role, payload)
}
