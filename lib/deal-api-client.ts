import type { DealStatus } from '@/lib/deal-lifecycle'
import type { TermsProposalPayload, TransitionPayload } from '@/lib/server/deal-actions'

type ApiResult<T = unknown> = { ok: true; deal?: unknown; placements?: unknown; material?: unknown; lifecycle?: unknown; completionReady?: boolean } & T
type ApiError = { ok: false; error: string }

async function postJson<T>(url: string, body: unknown): Promise<T | ApiError> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Request failed' }
  }
  return data as T
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

export async function postAcceptTerms(dealId: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/terms/accept`, {})
}

export async function postPublishPlacement(dealId: string, placementIndex: number, proofUrl: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/placements/publish`, { placementIndex, proofUrl })
}

export async function postReportPlacementIssue(dealId: string, placementIndex: number, issueComment: string) {
  return postJson<ApiResult>(`/api/deals/${dealId}/placements/report-issue`, { placementIndex, issueComment })
}

export async function postResolveDispute(dealId: string, toStatus: Extract<DealStatus, 'resolved_creator' | 'resolved_advertiser'>) {
  return postJson<ApiResult>(`/api/deals/${dealId}/admin/resolve`, { toStatus })
}

export function applyDealApiPatch(
  onUpdate: (patch: Record<string, unknown>) => void,
  result: ApiResult | ApiError,
): boolean {
  if (!result.ok) return false
  if (result.deal && typeof result.deal === 'object') {
    onUpdate(result.deal as Record<string, unknown>)
  }
  return true
}

export function getDealApiError(result: ApiResult | ApiError): string | null {
  return result.ok ? null : result.error
}
