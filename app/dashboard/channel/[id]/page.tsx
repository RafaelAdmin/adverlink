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
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/70">
          {error || 'Канал не найден'}
        </div>
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

      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
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
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '700', margin: '0 0 8px' }}>
              {channel.name}
            </h1>
            <div style={{ marginBottom: '8px' }}>
              <PlatformBadge platform={channel.platform} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 12px' }}>
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
                className="border border-white/20 text-white/80 hover-border-accent hover:text-white transition text-sm px-4 py-1.5 rounded-full"
              >
                Открыть в {getPlatformLabel(channel.platform || 'telegram')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
          Предпочитаемая валюта:
        </span>
        <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} size="sm" />
      </div>

      {isTelegram ? (
        <TelegramChannelAnalyticsSection
          channel={channel}
          display={{ displayCurrency, rates }}
        />
      ) : null}

      {generalMetrics.length > 0 && (
        <div
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {generalMetrics.map((item) => (
            <div
              key={item.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '20px',
              }}
            >
              <div className="text-white" style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
                {item.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {channel.description && (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ color: 'white', fontWeight: '600', fontSize: '16px', margin: '0 0 12px' }}>
            О канале
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: '1.6', margin: 0, fontSize: '14px' }}>
            {channel.description}
          </p>
        </div>
      )}

      {isMyChannel ? (
        <div
          style={{
            textAlign: 'center',
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '13px',
          }}
        >
          <i className="ti ti-user" style={{ fontSize: '20px', display: 'block', marginBottom: '6px' }} />
          Это ваш канал
        </div>
      ) : (
        <Link
          href={`/dashboard/add-channel/request-ad?channelId=${channel.id}`}
          className="btn-accent block w-full py-3.5 rounded-xl text-center font-medium text-white text-[15px] no-underline"
        >
          <i className="ti ti-speakerphone" style={{ marginRight: '8px' }} />
          Запросить рекламу
        </Link>
      )}
    </div>
  )
}
