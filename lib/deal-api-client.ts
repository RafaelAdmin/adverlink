import type { DealStatus } from '@/lib/deal-lifecycle'
import type { AdRequest, DealMaterial, DealPlacement } from '@/lib/database.types'
import type { TermsProposalPayload, TransitionPayload } from '@/lib/server/deal-actions'
import { coerceMaterial } from '@/lib/deal-content-ui'
import { coercePlacements } from '@/lib/placements-ui'

type ApiResult<T = unknown> = { ok: true; deal?: unknown; placements?: unknown; material?: unknown; lifecycle?: unknown; completionReady?: boolean } & T
export type DealApiError = { ok: false; error: string; status: number }
export type DealApiResult = ApiResult | DealApiError

async function postJson<T>(url: string, body: unknown): Promise<T | DealApiError> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Request failed', status: res.status }
  }
  return data as T
}

export function isStaleTermsApiError(result: DealApiResult): result is DealApiError {
  return !result.ok && result.status === 409
}

export function isConcurrentMutationError(result: DealApiResult): result is DealApiError {
  return !result.ok && result.status === 409
}

export async function postInitializePlacements(dealId: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/placements/initialize`, {})
}

export async function postDealTransition(dealId: string, payload: TransitionPayload) {
  return postJson<ApiResult>(`/api/deals/${dealId}/transition`, payload)
}

export async function postConfirmCompletion(dealId: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/confirm-completion`, {})
}

export async function postRequestRevision(dealId: string, advertiserNote: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/request-revision`, { advertiserNote })
}

export async function postDealDispute(dealId: string, reason: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/dispute`, { reason })
}

export async function postProposeTerms(dealId: string, payload: TermsProposalPayload) {
  return postJson<ApiResult>(`/api/deals/${dealId}/terms/propose`, payload)
}

export async function postAcceptTerms(dealId: string, proposedAt?: string) {
  return postJson<ApiResult>(
    `/api/deals/${dealId}/terms/accept`,
    proposedAt ? { proposedAt } : {},
  )
}

export async function postPublishPlacement(dealId: string, placementIndex: number, proofUrl: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/placements/publish`, { placementIndex, proofUrl })
}

export async function postSaveAdvertiserMaterial(
  dealId: string,
  payload: { bodyText: string; destinationUrl?: string },
) {
  return postJson<ApiResult>(`/api/deals/${dealId}/content`, {
    action: 'save_advertiser_material',
    bodyText: payload.bodyText,
    destinationUrl: payload.destinationUrl ?? null,
  })
}

export async function postSaveAdvertiserBrief(
  dealId: string,
  payload: { bodyText: string; destinationUrl?: string },
) {
  return postJson<ApiResult>(`/api/deals/${dealId}/content`, {
    action: 'save_advertiser_brief',
    bodyText: payload.bodyText,
    destinationUrl: payload.destinationUrl ?? null,
  })
}

export async function postSubmitCreatorContent(dealId: string, creatorSubmissionText: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/content`, {
    action: 'submit_creator_content',
    creatorSubmissionText,
  })
}

export async function postApproveCreatorContent(dealId: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/content`, {
    action: 'approve_creator_content',
  })
}

export async function postRequestContentChanges(dealId: string, comment: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/content`, {
    action: 'request_content_changes',
    comment,
  })
}

export async function postReportPlacementIssue(dealId: string, placementIndex: number, issueComment: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/placements/report-issue`, { placementIndex, issueComment })
}

export async function postResolvePlacementIssue(dealId: string, placementIndex: number, proofUrl: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/placements/resolve-issue`, { placementIndex, proofUrl })
}

export async function postResolveDispute(dealId: string, toStatus: Extract<DealStatus, 'resolved_creator' | 'resolved_advertiser'>) {
  return postJson<ApiResult>(`/api/deals/${dealId}/admin/resolve`, { toStatus })
}

export function applyDealApiPatch(
  onUpdate: (patch: Partial<AdRequest>) => void,
  result: DealApiResult,
  extras?: {
    onMaterialUpdate?: (material: DealMaterial | null) => void
    onPlacementsUpdate?: (placements: DealPlacement[]) => void
  },
): boolean {
  if (!result.ok) return false
  if (result.deal && typeof result.deal === 'object') {
    onUpdate(result.deal as Partial<AdRequest>)
  }
  if (extras?.onMaterialUpdate && 'material' in result) {
    extras.onMaterialUpdate(coerceMaterial(result.material))
  }
  if (extras?.onPlacementsUpdate && Array.isArray(result.placements)) {
    extras.onPlacementsUpdate(coercePlacements(result.placements))
  }
  return true
}

export function getDealApiError(result: DealApiResult): string | null {
  return result.ok ? null : result.error
}
