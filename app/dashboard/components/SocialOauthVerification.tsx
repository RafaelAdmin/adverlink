'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Surface from '@/components/ui/Surface'
import Button from '@/components/ui/Button'
import { getPlatformLabel, getSocialVerificationUiState } from '@/lib/channel-helpers'
import { getSocialOauthErrorMessage } from '@/lib/social-oauth-messages'

function isOauthPlatform(platform: string | null | undefined): platform is 'tiktok' | 'instagram' {
  return platform === 'tiktok' || platform === 'instagram'
}

const STATUS_COPY = {
  unverified: { label: 'Не подтверждён', color: '#fbbf24' },
  verified: { label: 'Контроль аккаунта подтверждён', color: '#4ade80' },
  expired: { label: 'Срок подтверждения истёк', color: '#fbbf24' },
  error: { label: 'Ошибка подключения', color: '#f87171' },
  confirming: { label: 'Подтверждаем…', color: 'rgba(255,255,255,0.6)' },
} as const

export default function SocialOauthVerification({
  channel,
  nextPath,
}: {
  channel: {
    id: string
    platform?: string | null
    is_verified?: boolean | null
    verification_status?: string | null
    verification_expires_at?: string | null
  }
  nextPath: string
}) {
  const searchParams = useSearchParams()
  const [confirming, setConfirming] = useState(false)
  const platform = channel.platform || ''

  const toast = useMemo(() => {
    const result = searchParams.get('verification')
    const reason = searchParams.get('reason')
    if (result === 'success') {
      return { kind: 'success' as const, text: 'Контроль аккаунта подтверждён' }
    }
    if (result === 'error') {
      return { kind: 'error' as const, text: getSocialOauthErrorMessage(reason) }
    }
    return null
  }, [searchParams])

  if (!isOauthPlatform(platform)) return null

  const uiState = confirming ? 'confirming' : getSocialVerificationUiState(channel)
  const copy = STATUS_COPY[uiState]
  const startHref = `/api/social-verification/${platform}/start?channelId=${encodeURIComponent(channel.id)}&next=${encodeURIComponent(nextPath)}`
  const buttonLabel =
    uiState === 'verified' || uiState === 'expired'
      ? 'Подтвердить повторно'
      : platform === 'tiktok'
        ? 'Подтвердить TikTok'
        : 'Подтвердить Instagram'

  return (
    <Surface padding="lg" className="flex flex-col gap-4">
      {toast && (
        <div
          className={
            toast.kind === 'success'
              ? 'bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm'
              : 'bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm'
          }
        >
          {toast.text}
        </div>
      )}

      <div>
        <h2 className="ui-section-title mb-1">Подтверждение {getPlatformLabel(platform)}</h2>
        <p className="ui-meta">
          Войдите через официальный {getPlatformLabel(platform)}, чтобы подтвердить контроль аккаунта.
          Пароль вводить в AdverLink не нужно.
        </p>
      </div>

      <div style={{ color: copy.color, fontSize: '13px', fontWeight: 600 }}>{copy.label}</div>

      <Button
        type="button"
        disabled={confirming}
        onClick={() => {
          setConfirming(true)
          window.location.assign(startHref)
        }}
      >
        {confirming ? 'Подтверждаем…' : buttonLabel}
      </Button>
    </Surface>
  )
}
