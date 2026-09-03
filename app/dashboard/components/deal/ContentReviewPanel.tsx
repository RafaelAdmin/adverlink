'use client'

import { useState } from 'react'
import { dealBtn } from '@/lib/deals'
import { validateChangeRequestComment } from '@/lib/deal-content-ui'

type ContentReviewPanelProps = {
  submissionText: string
  canApprove: boolean
  canRequestChanges: boolean
  submitting?: boolean
  onApprove: () => void
  onRequestChanges: (comment: string) => void
}

export default function ContentReviewPanel({
  submissionText,
  canApprove,
  canRequestChanges,
  submitting,
  onApprove,
  onRequestChanges,
}: ContentReviewPanelProps) {
  const [showChangeForm, setShowChangeForm] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleRequestChanges = () => {
    const validationError = validateChangeRequestComment(comment)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onRequestChanges(comment.trim())
  }

  return (
    <div className="space-y-4">
      <div className="ui-surface ui-surface--pad-sm space-y-3">
        <div className="ui-card-title">Контент от автора</div>
        <p className="ui-body whitespace-pre-wrap">{submissionText}</p>
      </div>

      {(canApprove || canRequestChanges) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {canApprove && (
            <button
              type="button"
              disabled={submitting}
              onClick={onApprove}
              style={{ ...dealBtn, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Обработка...' : 'Одобрить контент'}
            </button>
          )}
          {canRequestChanges && !showChangeForm && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowChangeForm(true)}
              className="ui-btn ui-btn--ghost ui-btn--sm"
            >
              Запросить правки
            </button>
          )}
        </div>
      )}

      {showChangeForm && canRequestChanges && (
        <div className="ui-surface ui-surface--pad-sm space-y-3">
          <div className="ui-card-title text-sm">Комментарий к правкам</div>
          <textarea
            rows={4}
            disabled={submitting}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="ui-input ui-textarea w-full"
            placeholder="Опишите, что нужно изменить..."
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={handleRequestChanges}
              style={{ ...dealBtn, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Отправка...' : 'Отправить запрос правок'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setShowChangeForm(false)
                setComment('')
                setError(null)
              }}
              className="ui-btn ui-btn--ghost ui-btn--sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
