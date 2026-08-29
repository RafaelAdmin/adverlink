'use client'

import { useEffect, useRef, useState } from 'react'
import { glassDealCard } from '@/lib/deals'
import type { AdRequest, Channel, DealPlacement } from '@/lib/database.types'
import {
  applyDealApiPatch,
  getDealApiError,
  isConcurrentMutationError,
  postInitializePlacements,
  postPublishPlacement,
  postReportPlacementIssue,
  postResolvePlacementIssue,
} from '@/lib/deal-api-client'
import {
  canInitializePlacements,
  coercePlacements,
  getAgreedPlacementsCount,
  getFinalReviewBanner,
  getNextPublishablePlacementIndex,
  getPlacementProgressPercent,
  getPublishedPlacementsCount,
  hasPlacementIssueBlockingCompletion,
  PLACEMENT_CONFLICT_MESSAGE,
  shouldUsePlacementsWorkflow,
  type PlacementTelegramAnalytics,
} from '@/lib/placements-ui'
import { toDateInputValue } from '@/lib/final-terms-ui'
import PlacementCard from './PlacementCard'
import PlacementProgress from './PlacementProgress'

type PlacementsSectionProps = {
  dealId: string
  request: AdRequest
  placements: DealPlacement[]
  role: 'creator' | 'advertiser'
  channel: Channel | null
  telegramAnalytics: Record<string, PlacementTelegramAnalytics>
  onDealUpdate: (patch: Partial<AdRequest>) => void
  onPlacementsUpdate: (placements: DealPlacement[]) => void
  onRefresh: () => Promise<void>
}

export default function PlacementsSection({
  dealId,
  request,
  placements,
  role,
  channel,
  telegramAnalytics,
  onDealUpdate,
  onPlacementsUpdate,
  onRefresh,
}: PlacementsSectionProps) {
  const [initializing, setInitializing] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [publishingIndex, setPublishingIndex] = useState<number | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [reportingIndex, setReportingIndex] = useState<number | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [resolvingIndex, setResolvingIndex] = useState<number | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const autoInitAttempted = useRef(false)

  const visible = shouldUsePlacementsWorkflow(request, placements)
  const totalCount = getAgreedPlacementsCount(request)
  const publishedCount = getPublishedPlacementsCount(request, placements)
  const progressPercent = getPlacementProgressPercent(request, placements)
  const nextPublishIndex = getNextPublishablePlacementIndex(request, placements)
  const finalReviewBanner = getFinalReviewBanner(request, placements)
  const hasIssues = hasPlacementIssueBlockingCompletion(request, placements)

  const applyActionResult = (result: Awaited<ReturnType<typeof postPublishPlacement>>) => {
    if (isConcurrentMutationError(result)) return 'conflict' as const
    const error = getDealApiError(result)
    if (error) return error
    applyDealApiPatch(onDealUpdate, result, { onPlacementsUpdate: onPlacementsUpdate })
    return null
  }

  const runInitialize = async (manual = false) => {
    setInitializing(true)
    setInitError(null)
    const result = await postInitializePlacements(dealId)
    const outcome = applyActionResult(result)
    if (outcome === 'conflict') {
      await onRefresh()
      setInitError(PLACEMENT_CONFLICT_MESSAGE)
    } else if (typeof outcome === 'string') {
      setInitError(outcome)
    } else {
      await onRefresh()
    }
    setInitializing(false)
    if (manual) autoInitAttempted.current = true
  }

  useEffect(() => {
    if (!visible) return
    if (role !== 'creator') return
    if (!canInitializePlacements(request, placements)) return
    if (autoInitAttempted.current) return
    autoInitAttempted.current = true
    void runInitialize()
  }, [visible, role, request.id, placements.length])

  if (!visible) return null

  const periodStart = toDateInputValue(request.placement_start_at)
  const periodEnd = toDateInputValue(request.placement_end_at)

  const handlePublish = async (placementIndex: number, proofUrl: string) => {
    setPublishingIndex(placementIndex)
    setPublishError(null)
    const result = await postPublishPlacement(dealId, placementIndex, proofUrl)
    const outcome = applyActionResult(result)
    if (outcome === 'conflict') {
      await onRefresh()
      setPublishError(PLACEMENT_CONFLICT_MESSAGE)
    } else if (typeof outcome === 'string') {
      setPublishError(outcome)
    } else {
      await onRefresh()
    }
    setPublishingIndex(null)
  }

  const handleReportIssue = async (placementIndex: number, comment: string) => {
    setReportingIndex(placementIndex)
    setReportError(null)
    const result = await postReportPlacementIssue(dealId, placementIndex, comment)
    const outcome = applyActionResult(result)
    if (outcome === 'conflict') {
      await onRefresh()
      setReportError(PLACEMENT_CONFLICT_MESSAGE)
    } else if (typeof outcome === 'string') {
      setReportError(outcome)
    } else {
      await onRefresh()
    }
    setReportingIndex(null)
  }

  const handleResolveIssue = async (placementIndex: number, proofUrl: string) => {
    setResolvingIndex(placementIndex)
    setResolveError(null)
    const result = await postResolvePlacementIssue(dealId, placementIndex, proofUrl)
    const outcome = applyActionResult(result)
    if (outcome === 'conflict') {
      await onRefresh()
      setResolveError(PLACEMENT_CONFLICT_MESSAGE)
    } else if (typeof outcome === 'string') {
      setResolveError(outcome)
    } else {
      await onRefresh()
    }
    setResolvingIndex(null)
  }

  return (
    <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
      <h2 className="text-white font-semibold mb-1">Размещения</h2>
      {(periodStart || periodEnd) && (
        <p className="text-white/50 text-xs mb-3">
          Период:{' '}
          {periodStart && periodEnd
            ? `${periodStart} — ${periodEnd}`
            : periodStart
              ? `с ${periodStart}`
              : `до ${periodEnd}`}
        </p>
      )}

      {placements.length === 0 ? (
        <div className="text-white/60 text-sm space-y-3">
          {role === 'creator' ? (
            <>
              <p>{initializing ? 'Подготовка размещений…' : 'Размещения ещё не подготовлены.'}</p>
              {!initializing && (
                <button
                  type="button"
                  onClick={() => void runInitialize(true)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5"
                >
                  Подготовить размещения
                </button>
              )}
            </>
          ) : (
            <p>Ожидается подготовка размещений автором канала.</p>
          )}
          {initError && <p className="text-red-400 text-xs">{initError}</p>}
        </div>
      ) : (
        <>
          <PlacementProgress
            publishedCount={publishedCount}
            totalCount={totalCount}
            percent={progressPercent}
            hasIssues={hasIssues}
          />

          {finalReviewBanner && (
            <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
              <div className="text-green-300 text-sm font-medium">{finalReviewBanner.title}</div>
              {finalReviewBanner.subtitle && (
                <div className="text-green-200/80 text-xs mt-1">{finalReviewBanner.subtitle}</div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {placements.map((placement) => (
              <PlacementCard
                key={placement.id}
                request={request}
                placements={placements}
                placement={placement}
                totalCount={totalCount}
                role={role}
                isNextPublishTarget={placement.placement_index === nextPublishIndex}
                telegramAnalytics={
                  placement.telegram_post_id
                    ? telegramAnalytics[placement.telegram_post_id] ?? null
                    : null
                }
                publishing={publishingIndex === placement.placement_index}
                reporting={reportingIndex === placement.placement_index}
                resolving={resolvingIndex === placement.placement_index}
                publishError={
                  publishingIndex === placement.placement_index ? publishError : null
                }
                reportError={
                  reportingIndex === placement.placement_index ? reportError : null
                }
                resolveError={
                  resolvingIndex === placement.placement_index ? resolveError : null
                }
                onPublish={handlePublish}
                onReportIssue={handleReportIssue}
                onResolveIssue={handleResolveIssue}
              />
            ))}
          </div>
        </>
      )}

      {channel?.platform && channel.platform !== 'telegram' && (
        <p className="text-white/40 text-xs mt-3">
          Для каналов вне Telegram используйте публичную ссылку на публикацию.
        </p>
      )}
    </div>
  )
}
