'use client'

import { useState } from 'react'
import type { AdRequest, DealPlacement } from '@/lib/database.types'
import {
  canAdvertiserReportIssue,
  canCreatorPublishPlacement,
  canCreatorResolveIssue,
  formatPlacementViews,
  getPlacementStatusLabel,
  getPlacementStatusTone,
  supportsPerPlacementApprovalInUi,
  type PlacementTelegramAnalytics,
} from '@/lib/placements-ui'
import PlacementPublishForm from './PlacementPublishForm'

type PlacementCardProps = {
  request: AdRequest
  placements: DealPlacement[]
  placement: DealPlacement
  totalCount: number
  role: 'creator' | 'advertiser'
  isNextPublishTarget: boolean
  telegramAnalytics: PlacementTelegramAnalytics | null
  publishing: boolean
  reporting: boolean
  resolving: boolean
  publishError: string | null
  reportError: string | null
  resolveError: string | null
  onPublish: (placementIndex: number, proofUrl: string) => void
  onReportIssue: (placementIndex: number, comment: string) => void
  onResolveIssue: (placementIndex: number, proofUrl: string) => void
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleDateString('ru-RU')
}

export default function PlacementCard({
  request,
  placements,
  placement,
  totalCount,
  role,
  isNextPublishTarget,
  telegramAnalytics,
  publishing,
  reporting,
  resolving,
  publishError,
  reportError,
  resolveError,
  onPublish,
  onReportIssue,
  onResolveIssue,
}: PlacementCardProps) {
  const [showReportForm, setShowReportForm] = useState(false)
  const [issueComment, setIssueComment] = useState('')

  const tone = getPlacementStatusTone(placement.status)
  const scheduledDate = formatDate(placement.scheduled_at)
  const publishedDate = formatDate(placement.published_at)
  const showPublish =
    role === 'creator' &&
    isNextPublishTarget &&
    canCreatorPublishPlacement(request, placements, placement.placement_index)
  const showReport =
    role === 'advertiser' &&
    canAdvertiserReportIssue(request, placements, placement.placement_index)
  const showResolve =
    role === 'creator' &&
    canCreatorResolveIssue(request, placements, placement.placement_index)

  const currentViews = formatPlacementViews(telegramAnalytics?.currentViews)
  const views24h = formatPlacementViews(telegramAnalytics?.views24h)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-white font-medium text-sm">
            Размещение {placement.placement_index} из {totalCount}
          </div>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: tone.bg, color: tone.color }}
        >
          {getPlacementStatusLabel(placement.status)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {scheduledDate && (
          <div className="text-white/60">
            <span className="text-white/40">Запланировано: </span>
            {scheduledDate}
          </div>
        )}
        {publishedDate && (
          <div className="text-white/60">
            <span className="text-white/40">Опубликовано: </span>
            {publishedDate}
          </div>
        )}

        {placement.proof_url && (
          <div>
            <div className="text-white/40 text-xs mb-1">Доказательство</div>
            <a
              href={placement.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 text-sm break-all hover:underline"
            >
              {placement.proof_url}
            </a>
          </div>
        )}

        {(currentViews || views24h) && (
          <div className="text-white/45 text-xs space-y-0.5">
            {currentViews && <div>Просмотры: {currentViews}</div>}
            {views24h && <div>Просмотры за 24ч: {views24h}</div>}
          </div>
        )}

        {placement.status === 'issue_reported' && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300 text-xs">
            <div className="font-medium mb-1">
              Проблема сообщена — устраните её до завершения сделки
            </div>
            {placement.issue_comment && (
              <p className="text-red-200/90 whitespace-pre-wrap">{placement.issue_comment}</p>
            )}
          </div>
        )}
      </div>

      {showPublish && (
        <PlacementPublishForm
          submitting={publishing}
          error={publishError}
          onSubmit={(proofUrl) => onPublish(placement.placement_index, proofUrl)}
        />
      )}

      {showResolve && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <PlacementPublishForm
            submitting={resolving}
            error={resolveError}
            showBorder={false}
            label="Ссылка на исправленную публикацию"
            submitLabel={resolving ? 'Отправка…' : 'Отправить исправление'}
            onSubmit={(proofUrl) => onResolveIssue(placement.placement_index, proofUrl)}
          />
        </div>
      )}

      {showReport && !showReportForm && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <button
            type="button"
            disabled={reporting}
            onClick={() => setShowReportForm(true)}
            className="text-sm text-red-300 hover:text-red-200 border border-red-500/30 rounded-xl px-3 py-2"
          >
            Сообщить о проблеме
          </button>
        </div>
      )}

      {showReport && showReportForm && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
          <textarea
            value={issueComment}
            disabled={reporting}
            onChange={(e) => setIssueComment(e.target.value)}
            rows={3}
            placeholder="Опишите проблему с этим размещением"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none resize-y"
          />
          {reportError && <p className="text-red-400 text-xs">{reportError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={reporting}
              onClick={() => setShowReportForm(false)}
              className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={reporting || !issueComment.trim()}
              onClick={() => onReportIssue(placement.placement_index, issueComment.trim())}
              className="flex-1 rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-300 disabled:opacity-50"
            >
              {reporting ? 'Отправка…' : 'Отправить'}
            </button>
          </div>
        </div>
      )}

      {supportsPerPlacementApprovalInUi() && null}
    </div>
  )
}
