'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getExchangeRates } from '@/lib/currency'
import { usePreferredCurrency } from '@/lib/usePreferredCurrency'
import { getChannelHandle, getChannelLink, getPlatformLabel } from '@/lib/channel-helpers'
import CurrencySelector from '@/app/dashboard/components/CurrencySelector'
import PlatformBadge from '@/app/dashboard/components/PlatformBadge'
import VerifiedBadge from '@/app/dashboard/components/VerifiedBadge'
import TelegramChannelAnalyticsSection from '@/app/dashboard/components/TelegramChannelAnalyticsSection'
import { formatEngagementRate } from '@/lib/channel-metrics'
import Surface from '@/components/ui/Surface'
import MetricStrip from '@/components/ui/MetricStrip'

export default function ChannelProfilePage() {
  const params = useParams()
  const id = params.id as string
  const [channel, setChannel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMyChannel, setIsMyChannel] = useState(false)
  const [displayCurrency, setDisplayCurrency] = usePreferredCurrency()
  const [rates, setRates] = useState<Record<string, number>>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    getExchangeRates().then(setRates).catch(() => {})
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('Канал не найден')
      } else {
        setChannel(data)
        setIsMyChannel(data.owner_id === user.id)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const openChannel = () => {
    if (channel?.telegram_username) {
      window.open(getChannelLink(channel), '_blank')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>
        Загрузка...
      </div>
    )
  }

  if (error || !channel) {
    return (
      <div>
        <Link
          href="/dashboard/marketplace"
          className="text-white/50 hover:text-white transition text-sm mb-8 inline-flex items-center gap-2"
        >
          ← Назад в маркетплейс
        </Link>
        <Surface padding="md" className="ui-empty text-center">
          {error || 'Канал не найден'}
        </Surface>
      </div>
    )
  }

  const isVerified = channel.is_verified || channel.verification_status === 'verified'
  const isTelegram = channel.platform === 'telegram' || !channel.platform
  const engagementLabel = formatEngagementRate(channel.subscriber_count, channel.avg_views)

  const generalMetrics = isTelegram
    ? [
        { label: 'Страна', value: channel.country || '—' },
        { label: 'Язык', value: channel.language || '—' },
      ]
    : [
        {
          label: 'Подписчики',
          value:
            channel.subscriber_count != null
              ? channel.subscriber_count.toLocaleString()
              : '—',
        },
        {
          label: 'Средние охваты',
          value:
            channel.avg_views != null && channel.avg_views > 0
              ? channel.avg_views.toLocaleString()
              : '—',
        },
        { label: 'Вовлечённость (ER)', value: engagementLabel ?? '—' },
        { label: 'Страна', value: channel.country || '—' },
        { label: 'Язык', value: channel.language || '—' },
      ]

  return (
    <div>
      <Link
        href="/dashboard/marketplace"
        className="text-white/50 hover:text-white transition text-sm mb-6 inline-flex items-center gap-2"
      >
        ← Назад в маркетплейс
      </Link>

      <Surface padding="lg" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
          {channel.avatar_url ? (
            <img
              src={channel.avatar_url}
              alt={channel.name}
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid rgba(255,255,255,0.15)',
                flexShrink: 0,
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.removeAttribute('style')
              }}
            />
          ) : null}

          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary, #9333ea)',
              border: '3px solid rgba(255,255,255,0.15)',
              display: channel.avatar_url ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '38px',
              fontWeight: '700',
              flexShrink: 0,
            }}
          >
            {channel.name?.[0]}
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 className="ui-page-title" style={{ fontSize: '1.375rem', margin: '0 0 6px' }}>
              {channel.name}
            </h1>
            <div style={{ marginBottom: '8px' }}>
              <PlatformBadge platform={channel.platform} />
            </div>
            <p className="ui-meta" style={{ margin: '0 0 10px' }}>
              {getChannelHandle(channel)}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
              {isVerified ? (
                <VerifiedBadge size={24} gradId={`verifiedGrad-channel-${channel.id}`} />
              ) : (
                <span className="bg-yellow-500/20 text-yellow-400 text-sm px-3 py-1 rounded-full">
                  На проверке
                </span>
              )}
              <button
                type="button"
                onClick={openChannel}
                className="ui-btn ui-btn--ghost ui-btn--sm"
              >
                Открыть в {getPlatformLabel(channel.platform || 'telegram')}
              </button>
            </div>
          </div>
        </div>
      </Surface>

      <div className="ui-surface ui-surface--pad-sm" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="ui-meta">Предпочитаемая валюта:</span>
        <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} size="sm" />
      </div>

      {isTelegram ? (
        <TelegramChannelAnalyticsSection
          channel={channel}
          display={{ displayCurrency, rates }}
        />
      ) : null}

      {!isTelegram && generalMetrics.length > 0 && (
        <MetricStrip items={generalMetrics.map((item) => ({ label: item.label, value: item.value }))} />
      )}

      {channel.description && (
        <Surface padding="md" style={{ marginBottom: '12px' }}>
          <h2 className="ui-card-title mb-2">О канале</h2>
          <p className="ui-body">{channel.description}</p>
        </Surface>
      )}

      {isMyChannel ? (
        <Surface padding="sm" className="ui-empty">
          <div className="ui-empty__icon"><i className="ti ti-user" /></div>
          <div className="ui-empty__text">Это ваш канал</div>
        </Surface>
      ) : (
        <Link
          href={`/dashboard/add-channel/request-ad?channelId=${channel.id}`}
          className="ui-btn ui-btn--primary ui-btn--lg ui-btn--full"
          style={{ textDecoration: 'none' }}
        >
          <i className="ti ti-speakerphone" />
          Запросить рекламу
        </Link>
      )}
    </div>
  )
}
