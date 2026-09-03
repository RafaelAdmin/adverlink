'use client'

import { useState } from 'react'
import { dealBtn } from '@/lib/deals'

type PlacementPublishFormProps = {
  submitting: boolean
  error: string | null
  onSubmit: (proofUrl: string) => void
  submitLabel?: string
  label?: string
  showBorder?: boolean
}

export default function PlacementPublishForm({
  submitting,
  error,
  onSubmit,
  submitLabel,
  label = 'Добавить доказательство публикации',
  showBorder = true,
}: PlacementPublishFormProps) {
  const [proofUrl, setProofUrl] = useState('')

  const handleSubmit = () => {
    const trimmed = proofUrl.trim()
    if (!trimmed || submitting) return
    onSubmit(trimmed)
  }

  return (
    <div className={showBorder ? 'mt-3 pt-3 border-t border-white/10 space-y-3' : 'space-y-3'}>
      <div className="text-white/50 text-xs">{label}</div>
      <input
        type="url"
        value={proofUrl}
        disabled={submitting}
        onChange={(e) => setProofUrl(e.target.value)}
        placeholder="https://t.me/channel/123"
        className="ui-input w-full"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="button"
        disabled={submitting || !proofUrl.trim()}
        style={{ ...dealBtn.submit, opacity: submitting || !proofUrl.trim() ? 0.6 : 1 }}
        onClick={handleSubmit}
      >
        {submitting ? 'Отправка…' : submitLabel ?? 'Отметить как опубликованное'}
      </button>
    </div>
  )
}
