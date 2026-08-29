'use client'

import { useState } from 'react'
import { dealBtn, glassDealCard } from '@/lib/deals'
import {
  applyDealApiPatch,
  getDealApiError,
  postConfirmCompletion,
  postDealDispute,
} from '@/lib/deal-api-client'
import type { AdRequest, DealPlacement } from '@/lib/database.types'
import {
  canAdvertiserConfirmCompletion,
  canAdvertiserOpenDispute,
  canShowFinalReviewCountdown,
  getDisputeOutcomeMessage,
  getFinalReviewStatusLabel,
  isFinalReviewTerminal,
  shouldShowNewLifecycleFinalReview,
} from '@/lib/final-review-ui'
import {
  getPublishedPlacementsCount,
  getAgreedPlacementsCount,
  hasPlacementIssueBlockingCompletion,
} from '@/lib/placements-ui'
import FinalReviewCountdown from './FinalReviewCountdown'

type FinalReviewSectionProps = {
  dealId: string
  request: AdRequest
  placements: DealPlacement[]
  role: 'creator' | 'advertiser'
  onDealUpdate: (patch: Partial<AdRequest>) => void
  onPlacementsUpdate: (placements: DealPlacement[]) => void
  onRefresh: () => Promise<void>
}

export default function FinalReviewSection({
  dealId,
  request,
  placements,
  role,
  onDealUpdate,
  onPlacementsUpdate,
  onRefresh,
}: FinalReviewSectionProps) {
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')

  if (!shouldShowNewLifecycleFinalReview(request, placements)) {
    return null
  }

  const publishedCount = getPublishedPlacementsCount(request, placements)
  const totalCount = getAgreedPlacementsCount(request)
  const hasIssues = hasPlacementIssueBlockingCompletion(request, placements)
  const canConfirm = canAdvertiserConfirmCompletion(request, placements)
  const canDispute = canAdvertiserOpenDispute(request, placements)
  const terminal = isFinalReviewTerminal(request)
  const disputeMessage = getDisputeOutcomeMessage(request.status)
  const showCountdown = canShowFinalReviewCountdown(request)

  const applyResult = async (result: Awaited<ReturnType<typeof postConfirmCompletion>>) => {
    const error = getDealApiError(result)
    if (error) {
      setActionError(error)
      return false
    }
    applyDealApiPatch(onDealUpdate, result, { onPlacementsUpdate })
    await onRefresh()
    return true
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    setActionError(null)
    const ok = await applyResult(await postConfirmCompletion(dealId))
    if (ok) setShowConfirm(false)
    setSubmitting(false)
  }

  const handleDispute = async () => {
    const reason = disputeReason.trim()
    if (!reason) return
    setSubmitting(true)
    setActionError(null)
    const result = await postDealDispute(dealId, reason)
    const ok = await applyResult(result)
    if (ok) {
      setShowDisputeForm(false)
      setDisputeReason('')
    }
    setSubmitting(false)
  }

  return (
    <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
      <h2 className="text-white font-semibold mb-1">{getFinalReviewStatusLabel(request)}</h2>
      <p className="text-white/50 text-sm mb-4">
        {publishedCount}/{totalCount} размещений опубликовано
      </p>

      {hasIssues && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-red-200 text-sm">
            Завершение заблокировано проблемой с размещением.
          </p>
        </div>
      )}

      {disputeMessage && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 space-y-2">
          <p className="text-amber-100 text-sm">{disputeMessage}</p>
          {request.dispute_reason && (
            <p className="text-amber-100/80 text-xs whitespace-pre-wrap">{request.dispute_reason}</p>
          )}
        </div>
      )}

      {request.status === 'completed' && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
          <p className="text-green-200 text-sm font-medium">Сделка завершена</p>
          {request.auto_completed && (
            <p className="text-green-200/70 text-xs mt-1">Подтверждено автоматически по истечении срока</p>
          )}
        </div>
      )}

      {!terminal && request.final_review_started_at && (
        <>
          <FinalReviewCountdown
            deadline={request.auto_complete_deadline}
            active={showCountdown}
          />

          {role === 'creator' && (
            <p className="text-white/55 text-sm mt-3">
              Ожидание финальной проверки рекламодателем.
            </p>
          )}

          {role === 'advertiser' && !showConfirm && !showDisputeForm && (
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                type="button"
                disabled={submitting || !canConfirm}
                onClick={() => setShowConfirm(true)}
                style={{
                  ...dealBtn.confirm,
                  opacity: submitting || !canConfirm ? 0.5 : 1,
                }}
              >
                Подтвердить выполнение
              </button>
              <button
                type="button"
                disabled={submitting || !canDispute}
                onClick={() => setShowDisputeForm(true)}
                className="rounded-xl border border-red-500/30 px-4 py-2.5 text-sm text-red-300 disabled:opacity-50"
              >
                Открыть спор
              </button>
            </div>
          )}

          {role === 'advertiser' && showConfirm && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-white/80 text-sm">
                Подтвердить, что все размещения выполнены корректно?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleConfirm()}
                  style={{ ...dealBtn.confirm, opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? 'Обработка…' : 'Подтвердить выполнение'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowConfirm(false)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {role === 'advertiser' && showDisputeForm && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <textarea
                value={disputeReason}
                disabled={submitting}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={3}
                placeholder="Опишите причину спора..."
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={submitting || !disputeReason.trim()}
                  onClick={() => void handleDispute()}
                  className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
                >
                  {submitting ? 'Отправка…' : 'Открыть спор'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowDisputeForm(false)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {actionError && <p className="text-red-400 text-sm mt-3">{actionError}</p>}
    </div>
  )
}
