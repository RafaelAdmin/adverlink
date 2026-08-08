/*
Run in Supabase SQL Editor:
alter table channels add column if not exists ad_price_currency text default 'USD';
alter table channels add column if not exists platform text default 'telegram';
alter table channels add column if not exists platform_url text;
*/
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import CurrencySelector from '@/app/dashboard/components/CurrencySelector'
import { CurrencyCode } from '@/lib/currency'
import { ChannelLimitBanner } from '@/app/dashboard/components/LimitCounter'
import { canAddChannel, isProPlan } from '@/lib/subscriptions'
import { useDashboard } from '../layout'

export default function AddChannelPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [telegramUsername, setTelegramUsername] = useState('')
  const [description, setDescription] = useState('')
  const [subscriberCount, setSubscriberCount] = useState('')
  const [avgViews, setAvgViews] = useState('')
  const [adPrice, setAdPrice] = useState('')
  const [adPriceCurrency, setAdPriceCurrency] = useState<CurrencyCode>('USD')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchSuccess, setFetchSuccess] = useState(false)
  const [channelCount, setChannelCount] = useState(0)
  const [userIsPro, setUserIsPro] = useState(false)
  const [limitsLoading, setLimitsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { isPro } = useDashboard()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const [{ count }, { data: profile }] = await Promise.all([
        supabase.from('channels').select('*', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('profiles').select('subscription_plan, is_admin').eq('id', user.id).single(),
      ])

      setChannelCount(count || 0)
      setUserIsPro(isProPlan(profile?.subscription_plan, profile?.is_admin) || isPro)
      setLimitsLoading(false)
    }
    getUser()
  }, [isPro])

  const resetForm = () => {
    setName('')
    setTelegramUsername('')
    setDescription('')
    setSubscriberCount('')
    setAvgViews('')
    setAdPrice('')
    setAvatarUrl('')
    setError(null)
    setFetchSuccess(false)
  }

  const handleBackToPlatforms = () => {
    setSelectedPlatform(null)
    resetForm()
  }

  const fetchFromTelegram = async () => {
    if (!telegramUsername) return
    setFetching(true)
    setError(null)
    setFetchSuccess(false)

    try {
      const username = telegramUsername.replace('@', '').trim()
      const res = await fetch(`/api/telegram?username=${username}`)
      const data = await res.json()

      if (data.error) {
        setError('Канал не найден. Проверь username и попробуй снова.')
        setFetching(false)
        return
      }

      setName(data.name || '')
      setDescription(data.description || '')
      setSubscriberCount(data.subscriber_count?.toString() || '0')
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url)
      }
      setFetchSuccess(true)
    } catch {
      setError('Ошибка подключения к Telegram')
    }

    setFetching(false)
  }

  const fetchFromYouTube = async () => {
    if (!telegramUsername) return
    setFetching(true)
    setError(null)
    setFetchSuccess(false)

    try {
      const res = await fetch(`/api/youtube?channel=${encodeURIComponent(telegramUsername)}`)
      const data = await res.json()

      if (data.error) {
        setError('Канал не найден. Проверь URL и попробуй снова.')
        setFetching(false)
        return
      }

      setName(data.name || '')
      setDescription(data.description || '')
      setSubscriberCount(data.subscriber_count?.toString() || '0')
      if (data.avatar_url) setAvatarUrl(data.avatar_url)
      setFetchSuccess(true)
    } catch {
      setError('Ошибка подключения')
    }

    setFetching(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!canAddChannel(userIsPro, channelCount)) {
      setError('Достигнут лимит Free: максимум 3 канала. Перейдите на Pro для добавления новых.')
      return
    }

    setSubmitting(true)
    setError(null)

    const username = telegramUsername.replace(/^@/, '').trim()

    const { data: newChannel, error: insertError } = await supabase
      .from('channels')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        telegram_username: username,
        description: description.trim() || null,
        subscriber_count: subscriberCount ? Number(subscriberCount) : 0,
        avg_views: avgViews ? Number(avgViews) : 0,
        ad_price: adPrice ? Number(adPrice) : null,
        ad_price_currency: adPriceCurrency,
        avatar_url: avatarUrl || null,
        platform: selectedPlatform || 'telegram',
        verification_status: 'pending',
        is_active: true,
      })
      .select('id')
      .single()

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push(`/dashboard/verify-channel/${newChannel.id}`)
  }

  if (!user || limitsLoading) {
    return <div className="text-white/50">Загрузка...</div>
  }

  const atChannelLimit = !canAddChannel(userIsPro, channelCount)

  if (selectedPlatform === null) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Назад
        </button>

        <ChannelLimitBanner used={channelCount} isPro={userIsPro} />

        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', marginBottom: '8px' }}>
          Добавить канал
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '32px' }}>
          Выбери социальную сеть
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <button
            type="button"
            disabled={atChannelLimit}
            onClick={() => !atChannelLimit && setSelectedPlatform('telegram')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '28px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              cursor: atChannelLimit ? 'not-allowed' : 'pointer',
              opacity: atChannelLimit ? 0.45 : 1,
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(37,99,235,0.15)'
              e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="24" fill="#229ED9" />
              <path d="M10.5 23.5L36.5 13L28 35L22 28.5L10.5 23.5Z" fill="white" opacity="0.3" />
              <path d="M10.5 23.5L22 28.5L20 36L17 31L10.5 23.5Z" fill="white" opacity="0.6" />
              <path d="M10.5 23.5L36.5 13L22 28.5L10.5 23.5Z" fill="white" />
              <path d="M20 36L22 28.5L25 31.5L20 36Z" fill="white" opacity="0.8" />
            </svg>
            <div>
              <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Telegram</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Канал или чат</div>
            </div>
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '20px', padding: '2px 8px',
              color: '#4ade80', fontSize: '10px', fontWeight: '600',
            }}>
              Доступно
            </div>
          </button>

          <button
            type="button"
            disabled={atChannelLimit}
            onClick={() => !atChannelLimit && setSelectedPlatform('youtube')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '28px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              cursor: atChannelLimit ? 'not-allowed' : 'pointer',
              opacity: atChannelLimit ? 0.45 : 1,
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(220,38,38,0.15)'
              e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="24" fill="#FF0000" />
              <rect x="10" y="16" width="28" height="16" rx="4" fill="white" />
              <polygon points="20,19 20,29 30,24" fill="#FF0000" />
            </svg>
            <div>
              <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>YouTube</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Канал</div>
            </div>
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '20px', padding: '2px 8px',
              color: '#4ade80', fontSize: '10px', fontWeight: '600',
            }}>
              Доступно
            </div>
          </button>

          <button
            type="button"
            disabled
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '28px 20px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              cursor: 'not-allowed',
              opacity: 0.5,
              position: 'relative',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
              <defs>
                <linearGradient id="igGrad" x1="0" y1="48" x2="48" y2="0">
                  <stop offset="0%" stopColor="#FFDC80" />
                  <stop offset="25%" stopColor="#FCAF45" />
                  <stop offset="50%" stopColor="#F77737" />
                  <stop offset="75%" stopColor="#C13584" />
                  <stop offset="100%" stopColor="#833AB4" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="24" fill="url(#igGrad)" />
              <rect x="14" y="14" width="20" height="20" rx="6" stroke="white" strokeWidth="2" fill="none" />
              <circle cx="24" cy="24" r="5" stroke="white" strokeWidth="2" fill="none" />
              <circle cx="31" cy="17" r="1.5" fill="white" />
            </svg>
            <div>
              <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Instagram</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Аккаунт</div>
            </div>
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '20px', padding: '2px 8px',
              color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '600',
            }}>
              Скоро
            </div>
          </button>

          <button
            type="button"
            disabled
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '28px 20px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px',
              cursor: 'not-allowed',
              opacity: 0.5,
              position: 'relative',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="24" fill="#010101" />
              <path d="M32 18C30.5 18 29.2 17.4 28.3 16.4C27.4 15.4 27 14.1 27 12.7V12H23V29.5C23 31.4 21.4 33 19.5 33C17.6 33 16 31.4 16 29.5C16 27.6 17.6 26 19.5 26C19.9 26 20.3 26.1 20.7 26.2V22.1C20.3 22 19.9 22 19.5 22C15.4 22 12 25.4 12 29.5C12 33.6 15.4 37 19.5 37C23.6 37 27 33.6 27 29.5V20.5C28.5 21.5 30.2 22 32 22V18Z" fill="white" />
            </svg>
            <div>
              <div style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>TikTok</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Аккаунт</div>
            </div>
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '20px', padding: '2px 8px',
              color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '600',
            }}>
              Скоро
            </div>
          </button>
        </div>
      </div>
    )
  }

  const isYouTube = selectedPlatform === 'youtube'

  return (
    <div className="max-w-xl mx-auto">
      <button
        type="button"
        onClick={handleBackToPlatforms}
        style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        ← Выбрать другую соцсеть
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '700', margin: 0 }}>
          Добавить канал
        </h1>
        <span style={{
          background: selectedPlatform === 'telegram' ? 'rgba(37,99,235,0.2)' : 'rgba(220,38,38,0.2)',
          border: `1px solid ${selectedPlatform === 'telegram' ? 'rgba(37,99,235,0.4)' : 'rgba(220,38,38,0.4)'}`,
          color: 'white', fontSize: '12px', fontWeight: '600',
          padding: '3px 10px', borderRadius: '20px',
        }}>
          {selectedPlatform === 'telegram' ? '✈️ Telegram' : '▶️ YouTube'}
        </span>
      </div>
      <p className="text-white/50 mb-8 text-sm">
        {isYouTube
          ? 'Введи URL или @handle YouTube-канала — мы автоматически подтянем данные.'
          : 'Введи username канала — мы автоматически подтянем данные из Telegram.'}
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-5"
      >
        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">
            {isYouTube ? 'YouTube канал URL или @handle' : 'Telegram username канала'}
          </span>
          <div className="flex gap-2">
            <input
              required
              value={telegramUsername}
              onChange={(e) => {
                setTelegramUsername(e.target.value)
                setFetchSuccess(false)
              }}
              placeholder={isYouTube ? '@channelname или youtube.com/channel/...' : '@channelname'}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus-accent transition text-sm"
            />
            <button
              type="button"
              onClick={isYouTube ? fetchFromYouTube : fetchFromTelegram}
              disabled={fetching || !telegramUsername}
              className="btn-accent disabled:opacity-50 transition text-white px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap"
            >
              {fetching ? 'Загрузка...' : '🔍 Найти'}
            </button>
          </div>
          {fetchSuccess && (
            <p className="text-green-400 text-xs">
              ✓ Данные успешно подтянуты из {isYouTube ? 'YouTube' : 'Telegram'}
            </p>
          )}
        </label>

        {avatarUrl && (
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-14 h-14 rounded-full object-cover"
            />
            <div>
              <div className="text-white font-medium text-sm">{name}</div>
              <div className="text-white/40 text-xs mt-1">{telegramUsername}</div>
              <div className="text-green-400 text-xs mt-1">✓ Аватар подтянут</div>
            </div>
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Название канала</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Заполнится автоматически"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus-accent transition text-sm"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Заполнится автоматически"
            rows={3}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus-accent transition text-sm resize-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-sm">Подписчиков</span>
            <input
              type="number"
              min={0}
              value={subscriberCount}
              onChange={(e) => setSubscriberCount(e.target.value)}
              placeholder="Подтянется автоматически"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus-accent transition text-sm"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-sm">Средние охваты</span>
            <input
              type="number"
              min={0}
              value={avgViews}
              onChange={(e) => setAvgViews(e.target.value)}
              placeholder="Введи вручную"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus-accent transition text-sm"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-white/70 text-sm">Цена рекламы</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CurrencySelector
              value={adPriceCurrency}
              onChange={setAdPriceCurrency}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={adPrice}
              onChange={(e) => setAdPrice(e.target.value)}
              placeholder="100"
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
            />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
            Укажите цену в удобной валюте
          </span>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <p className="text-yellow-400 text-xs">
            ⏳ После добавления канал будет на проверке. Зелёная галочка верификации появится после проверки администратором.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name || !telegramUsername}
          className="btn-accent disabled:opacity-50 transition text-white px-6 py-2.5 rounded-full text-sm font-medium mt-2"
        >
          {submitting ? 'Сохранение...' : 'Добавить канал'}
        </button>
      </form>
    </div>
  )
}
