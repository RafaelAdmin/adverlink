'use client'

import { useState } from 'react'
import { dealBtn } from '@/lib/deals'

type PlacementPublishFormProps = {
  submitting: boolean
  error: string | null
  onSubmit: (proofUrl: string) => void
}

export default function PlacementPublishForm({
  submitting,
  error,
  onSubmit,
}: PlacementPublishFormProps) {
  const [proofUrl, setProofUrl] = useState('')

  const handleSubmit = () => {
    const trimmed = proofUrl.trim()
    if (!trimmed || submitting) return
    onSubmit(trimmed)
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
      <div className="text-white/50 text-xs">Добавить доказательство публикации</div>
      <input
        type="url"
        value={proofUrl}
        disabled={submitting}
        onChange={(e) => setProofUrl(e.target.value)}
        placeholder="https://t.me/channel/123"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="button"
        disabled={submitting || !proofUrl.trim()}
        style={{ ...dealBtn.submit, opacity: submitting || !proofUrl.trim() ? 0.6 : 1 }}
        onClick={handleSubmit}
      >
        {submitting ? 'Публикация…' : 'Отметить как опубликованное'}
      </button>
    </div>
  )
}
