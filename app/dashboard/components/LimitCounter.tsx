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
      className={`mb-6 dashboard-panel ui-surface--pad-md ${atLimit ? 'border-red-500/30' : ''}`}
      style={atLimit ? { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' } : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${atLimit ? 'text-red-300' : 'ui-body'}`}>
            Каналы: {used}/{FREE_CHANNEL_LIMIT}
          </p>
          <p className="ui-meta mt-1">
            {atLimit
              ? 'Лимит Free достигнут. Перейдите на Pro для неограниченного числа каналов.'
              : 'На Free можно добавить до 3 каналов'}
          </p>
        </div>
        {atLimit && (
          <Link
            href="/dashboard/subscriptions"
            className="ui-btn ui-btn--primary ui-btn--sm whitespace-nowrap"
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
      className={`mb-6 dashboard-panel ui-surface--pad-md ${atLimit ? 'border-red-500/30' : ''}`}
      style={atLimit ? { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' } : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${atLimit ? 'text-red-300' : 'ui-body'}`}>
            Кампании в этом месяце: {used}/{FREE_CAMPAIGN_LIMIT}
          </p>
          <p className="ui-meta mt-1">
            {atLimit
              ? `Лимит Free достигнут. Сброс ${resetLabel}. Pro — безлимитные кампании.`
              : `Сброс лимита ${resetLabel}`}
          </p>
        </div>
        {atLimit && (
          <Link
            href="/dashboard/subscriptions"
            className="ui-btn ui-btn--primary ui-btn--sm whitespace-nowrap"
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
    <div className="dashboard-stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="dashboard-stat-card__label">{label}</span>
        <span className="ui-card-title text-sm">{used}/{limit}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? '#ef4444' : 'var(--accent-primary, #9333ea)',
          }}
        />
      </div>
      {type === 'campaigns' && (
        <p className="ui-meta mt-2">Сброс {getLimitResetLabel()}</p>
      )}
    </div>
  )
}
