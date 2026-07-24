'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CurrencyCode, formatPrice, getExchangeRates } from '@/lib/currency'
import CurrencySelector from '@/app/dashboard/components/CurrencySelector'

export default function ChannelProfilePage() {
  const params = useParams()
  const id = params.id as string
  const [channel, setChannel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMyChannel, setIsMyChannel] = useState(false)
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('USD')
  const [rates, setRates] = useState<Record<string, number>>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    getExchangeRates().then(setRates)
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

  const openTelegram = () => {
    if (channel?.telegram_username) {
      window.open(`https://t.me/${channel.telegram_username.replace(/^@/, '')}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center">
        <div className="text-white/50">Загрузка...</div>
      </div>
    )
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] p-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/dashboard/marketplace"
            className="text-white/50 hover:text-white transition text-sm mb-8 inline-flex items-center gap-2"
          >
            ← Назад
          </Link>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/70">
            {error || 'Канал не найден'}
          </div>
        </div>
      </div>
    )
  }

  const isVerified = channel.is_verified || channel.verification_status === 'verified'
  const subscribers = channel.subscriber_count ?? 0
  const avgViews = channel.avg_views ?? 0
  const estimatedReach = Math.round(subscribers * 0.3)
  const estimatedEngagement =
    subscribers > 0 ? ((avgViews / subscribers) * 100).toFixed(1) : '0'

  const convertChannelPrice = (price: number, fromCurrency: string = 'USD'): string => {
    if (!price) return '—'
    if (!rates[fromCurrency] || !rates[displayCurrency]) {
      return formatPrice(price, fromCurrency as CurrencyCode)
    }
    const inUSD = price / rates[fromCurrency]
    const converted = Math.round(inUSD * rates[displayCurrency])
    return formatPrice(converted, displayCurrency)
  }

  const metrics = [
    { label: 'Подписчики', value: subscribers.toLocaleString() },
    { label: 'Средние охваты', value: avgViews.toLocaleString() },
    { label: 'Вовлечённость', value: `${channel.engagement_rate ?? 0}%` },
    {
      label: 'Цена рекламы',
      value: channel.ad_price
        ? convertChannelPrice(channel.ad_price, channel.ad_price_currency || 'USD')
        : '—',
      accent: true,
    },
    { label: 'Страна', value: channel.country || '—' },
    { label: 'Язык', value: channel.language || '—' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard/marketplace"
          className="text-white/50 hover:text-white transition text-sm mb-8 inline-flex items-center gap-2"
        >
          ← Назад
        </Link>

        {/* Header */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {channel.avatar_url ? (
              <img
                src={channel.avatar_url}
                alt={channel.name}
                className="rounded-full object-cover"
                style={{
                  width: '80px',
                  height: '80px',
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
              className="rounded-full flex items-center justify-center text-white font-bold text-3xl flex-shrink-0"
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'var(--accent-primary, #9333ea)',
                border: '3px solid rgba(255,255,255,0.15)',
                display: channel.avatar_url ? 'none' : 'flex',
              }}
            >
              {channel.name?.[0]}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{channel.name}</h1>
              <p className="text-white/50 text-lg mb-4">@{channel.telegram_username}</p>
              <div className="flex flex-wrap items-center gap-3">
                {isVerified ? (
                  <span className="bg-green-500/20 text-green-400 text-sm px-3 py-1 rounded-full">
                    ✓ Верифицирован
                  </span>
                ) : (
                  <span className="bg-yellow-500/20 text-yellow-400 text-sm px-3 py-1 rounded-full">
                    На проверке
                  </span>
                )}
                <button
                  onClick={openTelegram}
                  className="border border-white/20 text-white/80 hover-border-accent hover:text-white transition text-sm px-4 py-1.5 rounded-full"
                >
                  Открыть в Telegram
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            Показывать цены в:
          </span>
          <CurrencySelector
            value={displayCurrency}
            onChange={setDisplayCurrency}
            size="sm"
          />
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {metrics.map((item) => (
            <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className={`text-2xl font-bold mb-1 ${'accent' in item && item.accent ? 'text-price-accent' : 'text-white'}`}>
                {item.value}
              </div>
              <div className="text-white/50 text-sm">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        {channel.description && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
            <h2 className="text-white font-semibold text-lg mb-3">О канале</h2>
            <p className="text-white/70 leading-relaxed">{channel.description}</p>
          </div>
        )}

        {/* Analytics placeholder */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-white font-semibold text-lg mb-4">Аналитика</h2>
          <p className="text-white/50 text-sm mb-6">Расширенная аналитика скоро появится</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-white font-semibold mb-1">{estimatedReach.toLocaleString()}</div>
              <div className="text-white/40 text-sm">Примерный охват поста</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-white font-semibold mb-1">{estimatedEngagement}%</div>
              <div className="text-white/40 text-sm">Вовлечённость %</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
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
              <i
                className="ti ti-user"
                style={{ fontSize: '20px', display: 'block', marginBottom: '6px' }}
              />
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
      </div>
    </div>
  )
}
