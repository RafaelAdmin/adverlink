'use client'

import { useState } from 'react'
import { glassDealCard } from '@/lib/deals'
import {
  applyDealApiPatch,
  getDealApiError,
  postApproveCreatorContent,
  postRequestContentChanges,
  postSaveAdvertiserBrief,
  postSaveAdvertiserMaterial,
  postSubmitCreatorContent,
} from '@/lib/deal-api-client'
import type { AdRequest, DealMaterial, DealPlacement } from '@/lib/database.types'
import {
  canAdvertiserApproveContent,
  canAdvertiserEditAdvertiserProvidesMaterial,
  canAdvertiserEditCreatorBrief,
  canAdvertiserRequestContentChanges,
  canCreatorSubmitContent,
  getContentModeLabel,
  getContentNextActionMessage,
  getCreatorContentStatusLabel,
  hasAdvertiserMaterial,
  hasCreatorSubmission,
  shouldShowContentSection,
  showCreatorApprovalWorkflow,
  type ContentFormValues,
} from '@/lib/deal-content-ui'
import AdvertiserContentForm from './AdvertiserContentForm'
import ContentReviewPanel from './ContentReviewPanel'
import CreatorContentSubmission from './CreatorContentSubmission'

type DealContentSectionProps = {
  dealId: string
  request: AdRequest
  material: DealMaterial | null
  placements: DealPlacement[]
  role: 'creator' | 'advertiser'
  onDealUpdate: (patch: Partial<AdRequest>) => void
  onMaterialUpdate: (material: DealMaterial | null) => void
  onPlacementsUpdate: (placements: DealPlacement[]) => void
  onRefresh: () => Promise<void>
}

export default function DealContentSection({
  dealId,
  request,
  material,
  placements,
  role,
  onDealUpdate,
  onMaterialUpdate,
  onPlacementsUpdate,
  onRefresh,
}: DealContentSectionProps) {
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!shouldShowContentSection(request, placements)) {
    return null
  }

  const nextAction = getContentNextActionMessage(request, placements, role, material)
  const mode = request.content_mode
  const showApproval = showCreatorApprovalWorkflow(request)
  const statusLabel = showApproval ? getCreatorContentStatusLabel(request.content_status) : null

  const applyResult = async (result: Awaited<ReturnType<typeof postSaveAdvertiserMaterial>>) => {
    const error = getDealApiError(result)
    if (error) {
      setActionError(error)
      return false
    }
    applyDealApiPatch(onDealUpdate, result, {
      onMaterialUpdate: (next) => onMaterialUpdate(next),
      onPlacementsUpdate: onPlacementsUpdate,
    })
    await onRefresh()
    return true
  }

  const saveAdvertiserProvides = async (values: ContentFormValues) => {
    setSubmitting(true)
    setActionError(null)
    const result = await postSaveAdvertiserMaterial(dealId, values)
    await applyResult(result)
    setSubmitting(false)
  }

  const saveBrief = async (values: ContentFormValues) => {
    setSubmitting(true)
    setActionError(null)
    const result = await postSaveAdvertiserBrief(dealId, values)
    await applyResult(result)
    setSubmitting(false)
  }

  const submitCreator = async (submissionText: string) => {
    setSubmitting(true)
    setActionError(null)
    const result = await postSubmitCreatorContent(dealId, submissionText)
    await applyResult(result)
    setSubmitting(false)
  }

  const approveContent = async () => {
    setSubmitting(true)
    setActionError(null)
    const result = await postApproveCreatorContent(dealId)
    await applyResult(result)
    setSubmitting(false)
  }

  const requestChanges = async (comment: string) => {
    setSubmitting(true)
    setActionError(null)
    const result = await postRequestContentChanges(dealId, comment)
    await applyResult(result)
    setSubmitting(false)
  }

  const renderAdvertiserProvides = () => {
    const advertiserCanEdit = canAdvertiserEditAdvertiserProvidesMaterial(request, role)
    const hasMaterial = hasAdvertiserMaterial(material)

    if (role === 'advertiser') {
      return (
        <AdvertiserContentForm
          mode="advertiser_provides"
          material={material}
          readOnly={!advertiserCanEdit}
          submitting={submitting}
          onSave={saveAdvertiserProvides}
        />
      )
    }

    if (hasMaterial) {
      return (
        <AdvertiserContentForm
          mode="advertiser_provides"
          material={material}
          readOnly
        />
      )
    }

    return (
      <p className="text-white/50 text-sm">
        Ожидание материала от рекламодателя.
      </p>
    )
  }

  const renderCreatorCreates = () => {
    const advertiserCanEditBrief = canAdvertiserEditCreatorBrief(request, role)
    const creatorCanSubmit = canCreatorSubmitContent(request, placements, role)
    const advertiserCanApprove = canAdvertiserApproveContent(request, placements, role)
    const advertiserCanRequestChanges = canAdvertiserRequestContentChanges(
      request,
      placements,
      role,
    )
    const approved = request.content_status === 'approved'
    const submitted = request.content_status === 'submitted'

    return (
      <div className="space-y-4">
        {role === 'advertiser' && (
          <AdvertiserContentForm
            mode="creator_creates_brief"
            material={material}
            readOnly={!advertiserCanEditBrief}
            submitting={submitting}
            onSave={saveBrief}
          />
        )}

        {role === 'creator' && (
          <CreatorContentSubmission
            material={material}
            canSubmit={creatorCanSubmit}
            submitting={submitting}
            onSubmit={submitCreator}
          />
        )}

        {role === 'advertiser' && submitted && hasCreatorSubmission(material) && (
          <ContentReviewPanel
            submissionText={material!.creator_submission_text!.trim()}
            canApprove={advertiserCanApprove}
            canRequestChanges={advertiserCanRequestChanges}
            submitting={submitting}
            onApprove={approveContent}
            onRequestChanges={requestChanges}
          />
        )}

        {approved && hasCreatorSubmission(material) && (
          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-4 space-y-2">
            <div className="text-emerald-200 font-medium">Контент одобрен</div>
            <p className="text-white/85 text-sm whitespace-pre-wrap">
              {material!.creator_submission_text}
            </p>
          </div>
        )}

        {role === 'creator' && submitted && !creatorCanSubmit && (
          <p className="text-white/50 text-sm">Ожидание одобрения рекламодателем.</p>
        )}
      </div>
    )
  }

  return (
    <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-white font-semibold">Контент и материалы</h2>
          <p className="text-white/45 text-sm mt-1">{getContentModeLabel(mode)}</p>
        </div>
        {statusLabel && (
          <span className="text-xs px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-white/70">
            {statusLabel}
          </span>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-3">
        <p className="text-purple-100/90 text-sm">{nextAction}</p>
      </div>

      {actionError && <p className="text-red-400 text-sm mb-4">{actionError}</p>}

      {mode === 'advertiser_provides' && renderAdvertiserProvides()}
      {mode === 'creator_creates' && renderCreatorCreates()}
    </div>
  )
}
