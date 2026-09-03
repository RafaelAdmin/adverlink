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
import PageHeader from '@/components/ui/PageHeader'
import Surface from '@/components/ui/Surface'
import Button from '@/components/ui/Button'
import AddChannelProgressStepper from '@/app/dashboard/components/AddChannelProgressStepper'

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
    return <div className="ui-meta">Загрузка...</div>
  }

  const atChannelLimit = !canAddChannel(userIsPro, channelCount)

  if (selectedPlatform === null) {
    return (
      <div className="dashboard-form-inner">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="ui-meta mb-8 inline-flex items-center gap-2 hover:opacity-80 transition"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ← Назад
        </button>

        <ChannelLimitBanner used={channelCount} isPro={userIsPro} />

        <AddChannelProgressStepper currentStep={1} className="mb-6" />

        <PageHeader title="Добавить канал" description="Выбери социальную сеть" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <button
            type="button"
            disabled={atChannelLimit}
            onClick={() => !atChannelLimit && setSelectedPlatform('telegram')}
            className="ui-surface ui-surface--hover ui-surface--pad-md"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              cursor: atChannelLimit ? 'not-allowed' : 'pointer',
              opacity: atChannelLimit ? 0.45 : 1,
              position: 'relative',
              border: 'none',
              textAlign: 'center',
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
              <div className="ui-card-title" style={{ marginBottom: '4px' }}>Telegram</div>
              <div className="ui-meta">Канал или чат</div>
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
            className="ui-surface ui-surface--hover ui-surface--pad-md"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              cursor: atChannelLimit ? 'not-allowed' : 'pointer',
              opacity: atChannelLimit ? 0.45 : 1,
              position: 'relative',
              border: 'none',
              textAlign: 'center',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="24" fill="#FF0000" />
              <rect x="10" y="16" width="28" height="16" rx="4" fill="white" />
              <polygon points="20,19 20,29 30,24" fill="#FF0000" />
            </svg>
            <div>
              <div className="ui-card-title" style={{ marginBottom: '4px' }}>YouTube</div>
              <div className="ui-meta">Канал</div>
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
            className="ui-surface ui-surface--pad-md"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              cursor: 'not-allowed',
              opacity: 0.5,
              position: 'relative',
              border: 'none',
              textAlign: 'center',
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
              <div className="ui-card-title" style={{ marginBottom: '4px' }}>Instagram</div>
              <div className="ui-meta">Аккаунт</div>
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
            className="ui-surface ui-surface--pad-md"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              cursor: 'not-allowed',
              opacity: 0.5,
              position: 'relative',
              border: 'none',
              textAlign: 'center',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="24" r="24" fill="#010101" />
              <path d="M32 18C30.5 18 29.2 17.4 28.3 16.4C27.4 15.4 27 14.1 27 12.7V12H23V29.5C23 31.4 21.4 33 19.5 33C17.6 33 16 31.4 16 29.5C16 27.6 17.6 26 19.5 26C19.9 26 20.3 26.1 20.7 26.2V22.1C20.3 22 19.9 22 19.5 22C15.4 22 12 25.4 12 29.5C12 33.6 15.4 37 19.5 37C23.6 37 27 33.6 27 29.5V20.5C28.5 21.5 30.2 22 32 22V18Z" fill="white" />
            </svg>
            <div>
              <div className="ui-card-title" style={{ marginBottom: '4px' }}>TikTok</div>
              <div className="ui-meta">Аккаунт</div>
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
    <div className="dashboard-form-inner">
      <button
        type="button"
        onClick={handleBackToPlatforms}
        className="ui-meta mb-6 inline-flex items-center gap-2 hover:opacity-80 transition"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        ← Выбрать другую соцсеть
      </button>

      <AddChannelProgressStepper currentStep={2} className="mb-6" />

      <PageHeader
        title="Добавить канал"
        description={
          isYouTube
            ? 'Введи URL или @handle YouTube-канала — мы автоматически подтянем данные.'
            : 'Введи username канала — мы автоматически подтянем данные из Telegram.'
        }
        actions={
          <span style={{
            background: selectedPlatform === 'telegram' ? 'rgba(37,99,235,0.2)' : 'rgba(220,38,38,0.2)',
            border: `1px solid ${selectedPlatform === 'telegram' ? 'rgba(37,99,235,0.4)' : 'rgba(220,38,38,0.4)'}`,
            color: 'var(--text)',
            fontSize: '12px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: 'var(--radius-md)',
          }}>
            {selectedPlatform === 'telegram' ? '✈️ Telegram' : '▶️ YouTube'}
          </span>
        }
      />

      <form onSubmit={handleSubmit}>
        <Surface padding="lg" className="flex flex-col gap-5">
        <label className="ui-field">
          <span className="ui-field__label">
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
              className="ui-input flex-1"
            />
            <Button
              type="button"
              onClick={isYouTube ? fetchFromYouTube : fetchFromTelegram}
              disabled={fetching || !telegramUsername}
            >
              {fetching ? 'Загрузка...' : '🔍 Найти'}
            </Button>
          </div>
          {fetchSuccess && (
            <p className="text-green-400 text-xs">
              ✓ Данные успешно подтянуты из {isYouTube ? 'YouTube' : 'Telegram'}
            </p>
          )}
        </label>

        {avatarUrl && (
          <div className="ui-surface ui-surface--pad-sm flex items-center gap-4">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-14 h-14 rounded-full object-cover"
            />
            <div>
              <div className="ui-card-title">{name}</div>
              <div className="ui-meta">{telegramUsername}</div>
              <div className="text-green-400 text-xs mt-1">✓ Аватар подтянут</div>
            </div>
          </div>
        )}

        <label className="ui-field">
          <span className="ui-field__label">Название канала</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Заполнится автоматически"
            className="ui-input"
          />
        </label>

        <label className="ui-field">
          <span className="ui-field__label">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Заполнится автоматически"
            rows={3}
            className="ui-input ui-textarea"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="ui-field">
            <span className="ui-field__label">Подписчиков</span>
            <input
              type="number"
              min={0}
              value={subscriberCount}
              onChange={(e) => setSubscriberCount(e.target.value)}
              placeholder="Подтянется автоматически"
              className="ui-input"
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Средние охваты</span>
            <input
              type="number"
              min={0}
              value={avgViews}
              onChange={(e) => setAvgViews(e.target.value)}
              placeholder="Введи вручную"
              className="ui-input"
            />
          </label>
        </div>

        <label className="ui-field">
          <span className="ui-field__label">Цена рекламы</span>
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
              className="ui-input flex-1"
            />
          </div>
          <span className="ui-field__hint">Укажите цену в удобной валюте</span>
        </label>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <p className="text-yellow-400 text-xs">
            ⏳ После добавления канал будет на проверке. Зелёная галочка верификации появится после проверки администратором.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <Button type="submit" disabled={submitting || !name || !telegramUsername} fullWidth>
          {submitting ? 'Сохранение...' : 'Добавить канал'}
        </Button>
        </Surface>
      </form>
    </div>
  )
}
