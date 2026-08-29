'use client'

import { useEffect, useState } from 'react'
import { getAutoCompleteRemaining } from '@/lib/final-review-ui'

type FinalReviewCountdownProps = {
  deadline: string | null | undefined
  active?: boolean
}

export default function FinalReviewCountdown({ deadline, active = true }: FinalReviewCountdownProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!active || !deadline) return
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [active, deadline])

  if (!active || !deadline) return null

  const remaining = getAutoCompleteRemaining(deadline, now)
  if (!remaining.label) return null

  return (
    <p
      className="text-sm mt-2"
      style={{ color: remaining.urgent ? '#f87171' : 'rgba(255,255,255,0.55)' }}
    >
      {remaining.label}
    </p>
  )
}
