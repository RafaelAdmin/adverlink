'use client'

import { useState } from 'react'
import { glassDealCard, dealBtn } from '@/lib/deals'
import {
  applyDealApiPatch,
  getDealApiError,
  isStaleTermsApiError,
  postAcceptTerms,
  postProposeTerms,
} from '@/lib/deal-api-client'
import type { AdRequest } from '@/lib/database.types'
import {
  buildFinalTermsFormFromDeal,
  canShowAcceptAction,
  canShowProposeAction,
  formValuesToProposalPayload,
  getFinalTermsStatusLabel,
  getFinalTermsUiState,
  isFinalTermsReadOnly,
  shouldShowFinalTermsSection,
  shouldShowTermsSummary,
  STALE_TERMS_MESSAGE,
  type FinalTermsFormValues,
} from '@/lib/final-terms-ui'
import FinalTermsForm from './FinalTermsForm'
import FinalTermsSummary from './FinalTermsSummary'

type FinalTermsSectionProps = {
  dealId: string
  request: AdRequest
  currentUserId: string
  onUpdate: (patch: Partial<AdRequest>) => void
  onRefresh: () => Promise<void>
}

export default function FinalTermsSection({
  dealId,
  request,
  currentUserId,
  onUpdate,
  onRefresh,
}: FinalTermsSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!shouldShowFinalTermsSection(request.status)) {
    return null
  }

  const uiState = getFinalTermsUiState(request, currentUserId)
  const statusLabel = getFinalTermsStatusLabel(uiState)
  const readOnly = isFinalTermsReadOnly(uiState)

  const handleStaleConflict = async () => {
    await onRefresh()
    setActionError(STALE_TERMS_MESSAGE)
    setShowForm(false)
  }

  const submitProposal = async (values: FinalTermsFormValues) => {
    setSubmitting(true)
    setActionError(null)

    const result = await postProposeTerms(dealId, formValuesToProposalPayload(values))

    if (isStaleTermsApiError(result)) {
      setSubmitting(false)
      await handleStaleConflict()
      return
    }

    const error = getDealApiError(result)
    if (error) {
      setActionError(error)
      setSubmitting(false)
      return
    }

    applyDealApiPatch(onUpdate, result)
    setShowForm(false)
    setSubmitting(false)
  }

  const acceptTerms = async () => {
    setSubmitting(true)
    setActionError(null)

    const proposedAt =
      typeof request.final_terms_proposed_at === 'string' ? request.final_terms_proposed_at : undefined

    const result = await postAcceptTerms(dealId, proposedAt)

    if (isStaleTermsApiError(result)) {
      setSubmitting(false)
      await handleStaleConflict()
      return
    }

    const error = getDealApiError(result)
    if (error) {
      setActionError(error)
      setSubmitting(false)
      return
    }

    applyDealApiPatch(onUpdate, result)
    setSubmitting(false)
  }

  const openEditor = () => {
    setActionError(null)
    setShowForm(true)
  }

  const headline =
    uiState === 'accepted'
      ? 'Условия согласованы'
      : uiState === 'locked'
        ? 'Условия зафиксированы'
        : 'Финальные условия'

  return (
    <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <h2 className="text-white font-semibold">{headline}</h2>
        <span
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{
            background:
              uiState === 'accepted' || uiState === 'locked'
                ? 'rgba(34,197,94,0.15)'
                : uiState === 'proposed_by_other'
                  ? 'rgba(234,179,8,0.15)'
                  : 'rgba(255,255,255,0.08)',
            color:
              uiState === 'accepted' || uiState === 'locked'
                ? '#86efac'
                : uiState === 'proposed_by_other'
                  ? '#fde047'
                  : 'rgba(255,255,255,0.65)',
          }}
        >
          {statusLabel}
        </span>
      </div>

      {uiState === 'none' && !showForm && (
        <p className="text-white/60 text-sm mb-4">Финальные условия ещё не согласованы.</p>
      )}

      {uiState === 'proposed_by_self' && !showForm && (
        <p className="text-white/60 text-sm mb-4">Ожидаем ответ второго участника.</p>
      )}

      {uiState === 'proposed_by_other' && !showForm && (
        <p className="text-white/60 text-sm mb-4">Контрагент предложил условия. Примите или предложите изменения.</p>
      )}

      {readOnly && !showForm && <FinalTermsSummary deal={request} />}

      {!readOnly && !showForm && shouldShowTermsSummary(request, uiState) && (
        <div className="mb-4">
          <FinalTermsSummary deal={request} compact={uiState !== 'none'} />
        </div>
      )}

      {showForm && (
        <FinalTermsForm
          initialValues={buildFinalTermsFormFromDeal(request)}
          submitting={submitting}
          onCancel={() => setShowForm(false)}
          onSubmit={submitProposal}
        />
      )}

      {!showForm && !readOnly && (
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          {canShowAcceptAction(uiState) && (
            <button
              type="button"
              disabled={submitting}
              style={{ ...dealBtn.accept, opacity: submitting ? 0.6 : 1 }}
              onClick={acceptTerms}
            >
              {submitting ? '…' : 'Принять условия'}
            </button>
          )}

          {canShowProposeAction(uiState) && (
            <button
              type="button"
              disabled={submitting}
              onClick={openEditor}
              className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
            >
              {uiState === 'none'
                ? 'Предложить условия'
                : uiState === 'proposed_by_self'
                  ? 'Изменить предложение'
                  : 'Предложить изменения'}
            </button>
          )}
        </div>
      )}

      {actionError && <p className="text-red-400 text-sm mt-3">{actionError}</p>}
    </div>
  )
}
