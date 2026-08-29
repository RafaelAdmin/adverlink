'use client'

import { useState } from 'react'
import { dealBtn } from '@/lib/deals'
import { validateCreatorSubmission } from '@/lib/deal-content-ui'
import type { DealMaterial } from '@/lib/database.types'

type CreatorContentSubmissionProps = {
  material: DealMaterial | null
  canSubmit: boolean
  submitting?: boolean
  onSubmit: (submissionText: string) => void
}

export default function CreatorContentSubmission({
  material,
  canSubmit,
  submitting,
  onSubmit,
}: CreatorContentSubmissionProps) {
  const [submissionText, setSubmissionText] = useState(
    material?.creator_submission_text?.trim() ?? '',
  )
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    const validationError = validateCreatorSubmission(submissionText)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onSubmit(submissionText.trim())
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <div className="text-white font-medium">Бриф рекламодателя</div>
        {material?.body_text ? (
          <>
            <p className="text-white/85 text-sm whitespace-pre-wrap">{material.body_text}</p>
            {material.destination_url && (
              <div>
                <div className="text-white/50 text-xs mb-1">URL назначения</div>
                <a
                  href={material.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm break-all hover:underline"
                >
                  {material.destination_url}
                </a>
              </div>
            )}
          </>
        ) : (
          <p className="text-white/50 text-sm">Рекламодатель ещё не добавил бриф.</p>
        )}
      </div>

      {material?.change_request_comment && (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
          <div className="text-amber-200 font-medium text-sm mb-2">Запрошенные правки</div>
          <p className="text-amber-100/90 text-sm whitespace-pre-wrap">
            {material.change_request_comment}
          </p>
        </div>
      )}

      {canSubmit ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
          <div className="text-white font-medium">Ваш контент для публикации</div>
          <textarea
            rows={6}
            disabled={submitting}
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-400/50"
            placeholder="Подготовьте рекламный текст для публикации..."
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            style={{ ...dealBtn, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Отправка...' : 'Отправить на одобрение'}
          </button>
        </div>
      ) : material?.creator_submission_text ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <div className="text-white font-medium">Отправленный контент</div>
          <p className="text-white/85 text-sm whitespace-pre-wrap">
            {material.creator_submission_text}
          </p>
        </div>
      ) : null}
    </div>
  )
}
