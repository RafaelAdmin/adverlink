'use client'

import Link from 'next/link'
import { FREE_CAMPAIGN_LIMIT, FREE_CHANNEL_LIMIT, getLimitResetLabel } from '@/lib/subscriptions'

export function ChannelLimitBanner({
  used,
  isPro,
}: {
  used: number
  isPro: boolean
}) {
  if (isPro) return null

  const atLimit = used >= FREE_CHANNEL_LIMIT

  return (
    <div
      className={`mb-6 rounded-2xl p-4 border ${atLimit ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/5'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${atLimit ? 'text-red-300' : 'text-white/80'}`}>
            Каналы: {used}/{FREE_CHANNEL_LIMIT}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {atLimit
              ? 'Лимит Free достигнут. Перейдите на Pro для неограниченного числа каналов.'
              : 'На Free можно добавить до 3 каналов'}
          </p>
        </div>
        {atLimit && (
          <Link
            href="/dashboard/subscriptions"
            className="btn-accent text-white rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap"
          >
            Получить Pro →
          </Link>
        )}
      </div>
    </div>
  )
}

export function CampaignLimitBanner({
  used,
  isPro,
}: {
  used: number
  isPro: boolean
}) {
  if (isPro) return null

  const atLimit = used >= FREE_CAMPAIGN_LIMIT
  const resetLabel = getLimitResetLabel()

  return (
    <div
      className={`mb-6 rounded-2xl p-4 border ${atLimit ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/5'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${atLimit ? 'text-red-300' : 'text-white/80'}`}>
            Кампании в этом месяце: {used}/{FREE_CAMPAIGN_LIMIT}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {atLimit
              ? `Лимит Free достигнут. Сброс ${resetLabel}. Pro — безлимитные кампании.`
              : `Сброс лимита ${resetLabel}`}
          </p>
        </div>
        {atLimit && (
          <Link
            href="/dashboard/subscriptions"
            className="btn-accent text-white rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap"
          >
            Получить Pro →
          </Link>
        )}
      </div>
    </div>
  )
}

export function DashboardLimitCard({
  type,
  used,
  isPro,
}: {
  type: 'channels' | 'campaigns'
  used: number
  isPro: boolean
}) {
  if (isPro) return null

  const limit = type === 'channels' ? FREE_CHANNEL_LIMIT : FREE_CAMPAIGN_LIMIT
  const label = type === 'channels' ? 'Каналы' : 'Кампании в этом месяце'
  const pct = Math.min(100, (used / limit) * 100)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '20px',
    }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/50 text-sm">{label}</span>
        <span className="text-white font-semibold text-sm">{used}/{limit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? '#ef4444' : 'var(--accent-primary, #9333ea)',
          }}
        />
      </div>
      {type === 'campaigns' && (
        <p className="text-white/30 text-xs mt-2">Сброс {getLimitResetLabel()}</p>
      )}
    </div>
  )
}
