import type { AdRequest, DealPlacement } from '@/lib/database.types'
import {
  canPublishPlacement,
  canReportPlacementIssue,
  canStartFinalReview,
  countPublishedPlacements,
  getExpectedPlacementsCount,
  hasUnresolvedPlacementIssues,
  isAllPlacementsPublished,
  isCreatorContentReady,
  isLegacyLifecycleDeal,
  isNewLifecycleDeal,
  type DealLifecycleContext,
  type DealPlacementSnapshot,
  type PlacementStatus,
} from '@/lib/deal-lifecycle'
import { normalizeTermsStatus } from '@/lib/final-terms-ui'

const PLACEMENT_STATUSES: readonly PlacementStatus[] = [
  'scheduled',
  'awaiting_publication',
  'published',
  'issue_reported',
]

export type PlacementTelegramAnalytics = {
  currentViews: number | null
  views24h: number | null
}

export function normalizePlacementStatus(raw: string | null | undefined): PlacementStatus {
  if (raw && (PLACEMENT_STATUSES as readonly string[]).includes(raw)) {
    return raw as PlacementStatus
  }
  return 'scheduled'
}

export function coercePlacementRow(row: Record<string, unknown>): DealPlacement {
  return {
    id: String(row.id ?? ''),
    ad_request_id: String(row.ad_request_id ?? ''),
    placement_index: Number(row.placement_index) || 1,
    status: normalizePlacementStatus(row.status as string | undefined),
    scheduled_at: row.scheduled_at == null ? null : String(row.scheduled_at),
    published_at: row.published_at == null ? null : String(row.published_at),
    proof_url: row.proof_url == null ? null : String(row.proof_url),
    telegram_message_id:
      row.telegram_message_id == null ? null : Number(row.telegram_message_id),
    telegram_post_id: row.telegram_post_id == null ? null : String(row.telegram_post_id),
    issue_reported_at: row.issue_reported_at == null ? null : String(row.issue_reported_at),
    issue_reported_by: row.issue_reported_by == null ? null : String(row.issue_reported_by),
    issue_comment: row.issue_comment == null ? null : String(row.issue_comment),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  }
}

export function coercePlacements(rows: unknown): DealPlacement[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => (row && typeof row === 'object' ? coercePlacementRow(row as Record<string, unknown>) : null))
    .filter((row): row is DealPlacement => Boolean(row?.id))
    .sort((a, b) => a.placement_index - b.placement_index)
}

export function toPlacementSnapshots(placements: DealPlacement[]): DealPlacementSnapshot[] {
  return placements.map((p) => ({
    placementIndex: p.placement_index,
    status: p.status,
  }))
}

export function buildLifecycleContextFromAdRequest(
  request: AdRequest,
  placements: DealPlacement[],
): DealLifecycleContext {
  return {
    status: request.status,
    termsStatus: normalizeTermsStatus(request.terms_status),
    contentMode: request.content_mode,
    contentStatus: request.content_status,
    placementsCount: request.placements_count,
    placements: toPlacementSnapshots(placements),
    allPlacementsPublishedAt: request.all_placements_published_at,
    finalReviewStartedAt: request.final_review_started_at,
    autoCompleteDeadline: request.auto_complete_deadline,
    termsLockedAt: request.terms_locked_at,
  }
}

export function shouldUsePlacementsWorkflow(
  request: AdRequest,
  placements: DealPlacement[],
): boolean {
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  if (isLegacyLifecycleDeal(ctx)) return false

  const termsReady =
    request.terms_status === 'accepted' || request.terms_status === 'locked'
  if (!termsReady) return false

  const count = request.placements_count
  if (count == null || count < 1) return false

  return isNewLifecycleDeal(ctx) || placements.length > 0
}

export function canInitializePlacements(
  request: AdRequest,
  placements: DealPlacement[],
): boolean {
  if (!shouldUsePlacementsWorkflow(request, placements)) return false
  return placements.length === 0
}

export function getAgreedPlacementsCount(request: AdRequest): number {
  return request.placements_count ?? 0
}

export function getPublishedPlacementsCount(
  request: AdRequest,
  placements: DealPlacement[],
): number {
  return countPublishedPlacements(buildLifecycleContextFromAdRequest(request, placements))
}

export function getPlacementProgressPercent(
  request: AdRequest,
  placements: DealPlacement[],
): number {
  const total = getAgreedPlacementsCount(request)
  if (total < 1) return 0
  const published = getPublishedPlacementsCount(request, placements)
  return Math.min(100, Math.round((published / total) * 100))
}

export function getNextPublishablePlacementIndex(
  request: AdRequest,
  placements: DealPlacement[],
): number | null {
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  const sorted = [...placements].sort((a, b) => a.placement_index - b.placement_index)
  for (const placement of sorted) {
    if (canPublishPlacement(ctx, placement.placement_index)) {
      return placement.placement_index
    }
  }
  return null
}

export function canCreatorPublishPlacement(
  request: AdRequest,
  placements: DealPlacement[],
  placementIndex: number,
): boolean {
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  return canPublishPlacement(ctx, placementIndex)
}

export function canAdvertiserReportIssue(
  request: AdRequest,
  placements: DealPlacement[],
  placementIndex: number,
): boolean {
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  return canReportPlacementIssue(ctx, placementIndex)
}

export function getPlacementStatusLabel(status: PlacementStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Запланировано'
    case 'awaiting_publication':
      return 'Ожидает публикации'
    case 'published':
      return 'Опубликовано'
    case 'issue_reported':
      return 'Проблема сообщена'
  }
}

export function getPlacementStatusTone(status: PlacementStatus): {
  bg: string
  color: string
} {
  switch (status) {
    case 'published':
      return { bg: 'rgba(34,197,94,0.15)', color: '#86efac' }
    case 'issue_reported':
      return { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5' }
    case 'awaiting_publication':
      return { bg: 'rgba(234,179,8,0.15)', color: '#fde047' }
    default:
      return { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }
  }
}

export function formatPlacementViews(views: number | null | undefined): string | null {
  if (views == null || !Number.isFinite(views)) return null
  return views.toLocaleString('ru-RU')
}

export function getAllPlacementsCompleteMessage(
  request: AdRequest,
  placements: DealPlacement[],
): string | null {
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  if (!isAllPlacementsPublished(ctx)) return null

  if (request.final_review_started_at) {
    return 'Ожидание финальной проверки рекламодателем'
  }

  if (
    request.content_mode === 'creator_creates' &&
    !isCreatorContentReady(ctx)
  ) {
    return 'Все размещения опубликованы, но требуется одобрение контента перед финальной проверкой.'
  }

  if (canStartFinalReview(ctx)) {
    return 'Все размещения опубликованы'
  }

  return 'Все размещения опубликованы'
}

export function getFinalReviewBanner(
  request: AdRequest,
  placements: DealPlacement[],
): { title: string; subtitle: string | null } | null {
  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  if (!isAllPlacementsPublished(ctx)) return null

  if (request.final_review_started_at) {
    return {
      title: 'Все размещения опубликованы',
      subtitle: 'Ожидание финальной проверки рекламодателем',
    }
  }

  if (
    request.content_mode === 'creator_creates' &&
    !isCreatorContentReady(ctx)
  ) {
    return {
      title: 'Все размещения опубликованы',
      subtitle:
        'Требуется одобрение контента автором перед началом финальной проверки.',
    }
  }

  return null
}

export function hasPlacementIssueBlockingCompletion(
  request: AdRequest,
  placements: DealPlacement[],
): boolean {
  return hasUnresolvedPlacementIssues(buildLifecycleContextFromAdRequest(request, placements))
}

export function supportsPerPlacementApprovalInUi(): boolean {
  return false
}

export const PLACEMENT_CONFLICT_MESSAGE =
  'Состояние размещения изменилось. Обновите страницу и попробуйте снова.'

export function parseTelegramAnalyticsMap(
  posts: Array<{ id: string; current_views: number | null }> | null,
  snapshots: Array<{ post_id: string; views: number | null; captured_at: string | null }> | null,
): Record<string, PlacementTelegramAnalytics> {
  const map: Record<string, PlacementTelegramAnalytics> = {}

  for (const post of posts ?? []) {
    map[post.id] = {
      currentViews: post.current_views ?? null,
      views24h: null,
    }
  }

  for (const snap of snapshots ?? []) {
    if (!snap.captured_at) continue
    const existing = map[snap.post_id] ?? { currentViews: null, views24h: null }
    existing.views24h = snap.views ?? null
    map[snap.post_id] = existing
  }

  return map
}

export function getExpectedPlacementsTotal(
  request: AdRequest,
  placements: DealPlacement[],
): number {
  return getExpectedPlacementsCount(buildLifecycleContextFromAdRequest(request, placements))
}
