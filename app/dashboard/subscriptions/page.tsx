'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'
import SubscriptionPaymentModal from '../components/SubscriptionPaymentModal'
import UserAvatar from '../components/UserAvatar'
import {
  AVATAR_FRAME_OPTIONS,
  AVATAR_FRAME_PRICE_EUR,
  type AvatarFrameColorId,
} from '@/lib/avatar-frame'
import {
  FREE_CAMPAIGN_LIMIT,
  FREE_CHANNEL_LIMIT,
  PRO_PRICE_EUR,
  isProPlan,
} from '@/lib/subscriptions'
import PageHeader from '@/components/ui/PageHeader'
import Surface from '@/components/ui/Surface'
import Button from '@/components/ui/Button'

function FeatureItem({ included, children }: { included: boolean; children: React.ReactNode }) {
  return (
    <li className={`text-sm flex items-start gap-2 ${included ? 'ui-body' : 'ui-meta opacity-60'}`}>
      <span className={included ? 'text-green-400' : 'ui-meta'}>{included ? '✓' : '✗'}</span>
      {children}
    </li>
  )
}

const FREE_FEATURES = [
  'Профиль и маркетплейс',
  `До ${FREE_CHANNEL_LIMIT} каналов (создатель)`,
  `До ${FREE_CAMPAIGN_LIMIT} кампаний в месяц (рекламодатель)`,
  'Неограниченные сделки и отзывы',
  'Базовая статистика',
]

const PRO_CREATOR_FEATURES = [
  'Неограниченное число каналов',
  'Приоритет в маркетплейсе',
  'Значок Pro на профиле',
  'Отчёты Excel/PDF за любой период',
  'Расширенная аналитика (Telegram, YouTube)',
]

const PRO_ADVERTISER_FEATURES = [
  'Неограниченные кампании',
  'Приоритет в маркетплейсе',
  'Значок Pro на профиле',
  'Отчёт расходов Excel/PDF за любой период',
  'Расширенная аналитика кампаний',
]

const BUSINESS_FEATURES = [
  'Всё из плана Pro',
  'API ключи для интеграций',
  'Автопостинг через Telegram бота',
  'Мультиаккаунт (до 5 пользователей)',
  'Приоритетная поддержка 24/7',
  'Персональный менеджер',
  'Кастомная аналитика',
  'White label (ваш бренд)',
]

export default function SubscriptionsPage() {
  const { role, isPro, refreshPlan, avatarUrl, avatarFrameColor } = useDashboard()
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [showFramePayment, setShowFramePayment] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [buyingFrame, setBuyingFrame] = useState(false)
  const [selectedFrame, setSelectedFrame] = useState<AvatarFrameColorId>('blue')
  const [currentFrame, setCurrentFrame] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, is_admin, avatar_frame_color, full_name, username')
        .eq('id', user.id)
        .single()

      setPlan(isProPlan(profile?.subscription_plan, profile?.is_admin) ? 'pro' : 'free')
      setCurrentFrame(profile?.avatar_frame_color || avatarFrameColor || null)
      setUserName(profile?.full_name || profile?.username || user.email?.split('@')[0] || 'U')
      setLoading(false)
    }
    load()
  }, [isPro, avatarFrameColor])

  const handleSubscribe = async () => {
    setSubscribing(true)
    setError(null)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Оплата временно недоступна')
      }
      setPlan('pro')
      refreshPlan?.()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Оплата временно недоступна')
      return false
    } finally {
      setSubscribing(false)
    }
  }

  const handleBuyFrame = async () => {
    setBuyingFrame(true)
    setError(null)
    try {
      const res = await fetch('/api/avatar-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameColor: selectedFrame }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Покупка временно недоступна')
      }

      setCurrentFrame(selectedFrame)
      window.dispatchEvent(new CustomEvent('adverlink-avatar-frame-updated'))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Покупка временно недоступна')
      return false
    } finally {
      setBuyingFrame(false)
    }
  }

  const proFeatures = role === 'creator' ? PRO_CREATOR_FEATURES : PRO_ADVERTISER_FEATURES
  const activePro = plan === 'pro' || isPro

  if (loading) {
    return <div className="ui-meta">Загрузка...</div>
  }

  return (
    <div>
      <SubscriptionPaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onConfirm={async () => {
          const ok = await handleSubscribe()
          if (ok) setShowPayment(false)
          return ok
        }}
        saving={subscribing}
      />

      <SubscriptionPaymentModal
        open={showFramePayment}
        onClose={() => setShowFramePayment(false)}
        onConfirm={async () => {
          const ok = await handleBuyFrame()
          if (ok) setShowFramePayment(false)
          return ok
        }}
        saving={buyingFrame}
        title="Рамка для аватарки"
        subtitle="Разовая покупка — цветная обводка вокруг вашего аватара"
        price={AVATAR_FRAME_PRICE_EUR}
        pricePeriod=""
        priceHint="Разовая покупка"
        priceNote="Рамка отображается в профиле и топбаре"
        payButtonLabel={`Купить за €${AVATAR_FRAME_PRICE_EUR}`}
        successTitle="Рамка активирована!"
        successMessage="Цветная рамка добавлена к вашему аватару"
      />

      <PageHeader
        title="Подписки"
        description={
          role === 'creator'
            ? 'Управляй каналами и получай больше заказов с Pro'
            : 'Запускай больше кампаний и отслеживай расходы с Pro'
        }
      />

      {activePro && (
        <Surface padding="md" className="mb-8 border-2 border-accent-strong flex items-center gap-4">
          <span className="text-3xl">★</span>
          <div>
            <p className="ui-card-title">Pro активен</p>
            <p className="ui-meta">Все Pro-функции доступны</p>
          </div>
        </Surface>
      )}

      {error && (
        <div className="mb-6 rounded-xl p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Surface padding="md" className={!activePro ? '' : 'opacity-80'}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="ui-section-title">Free</h3>
            <span className="ui-meta">€0</span>
          </div>
          {!activePro && (
            <span className="inline-block ui-meta text-xs px-3 py-1 rounded-full mb-4" style={{ background: 'var(--border-subtle)' }}>
              Текущий план
            </span>
          )}
          <ul className="space-y-2 mb-6">
            {FREE_FEATURES.map((f) => (
              <FeatureItem key={f} included>{f}</FeatureItem>
            ))}
          </ul>
          <Button variant="secondary" fullWidth disabled>
            {!activePro ? 'Текущий план' : 'Free'}
          </Button>
        </Surface>

        <Surface padding="md" className={`relative ${activePro ? 'border-2 border-accent-strong' : ''}`}>
          {!activePro && (
            <span className="absolute -top-3 right-4 ui-btn ui-btn--primary ui-btn--sm text-xs">
              Рекомендуем
            </span>
          )}
          <div className="flex items-center justify-between mb-4">
            <h3 className="ui-section-title flex items-center gap-2">
              <span className="text-yellow-400">★</span> Pro
            </h3>
            <span className="text-price-accent text-sm font-semibold">€{PRO_PRICE_EUR}/мес</span>
          </div>
          {activePro && (
            <span className="inline-block badge-accent text-xs px-3 py-1 rounded-full mb-4">
              ✓ Активен
            </span>
          )}
          <ul className="space-y-2 mb-6">
            <FeatureItem included>Всё из Free</FeatureItem>
            {proFeatures.map((f) => (
              <FeatureItem key={f} included>{f}</FeatureItem>
            ))}
          </ul>
          {!activePro ? (
            <>
              <Button type="button" variant="secondary" fullWidth onClick={() => setShowPayment(true)}>
                Скоро — €{PRO_PRICE_EUR}/мес
              </Button>
              <p className="ui-meta text-xs mt-3 text-center">
                Оплата Pro пока недоступна. Напишите на support@adverlink.am для раннего доступа.
              </p>
            </>
          ) : (
            <Button variant="secondary" fullWidth disabled>
              Pro активен
            </Button>
          )}
        </Surface>

        <Surface padding="md" className="relative opacity-70" style={{ filter: 'grayscale(30%)' }}>
          <span className="absolute top-4 right-4 ui-meta text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full" style={{ background: 'var(--border-subtle)' }}>
            Скоро
          </span>
          <div className="flex items-center justify-between mb-4">
            <h3 className="ui-section-title ui-meta">Бизнес</h3>
            <span className="ui-meta text-sm">€80/мес</span>
          </div>
          <p className="ui-meta text-xs mb-4">Для агентств и крупных рекламодателей</p>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0 0 16px' }} />
          <ul className="space-y-2 mb-6">
            {BUSINESS_FEATURES.map((f) => (
              <li key={f} className="text-sm flex items-start gap-2 ui-meta">
                <span>✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Button variant="secondary" fullWidth disabled>
            Скоро доступно
          </Button>
        </Surface>
      </div>

      <Surface padding="md" className="mb-8">
        <h2 className="ui-section-title mb-2">Рамка для аватарки</h2>
        <p className="ui-meta mb-6">
          Выберите цвет рамки вокруг вашего аватара — €{AVATAR_FRAME_PRICE_EUR} за разовую покупку
        </p>

        <div className="flex flex-wrap items-center gap-8">
          <UserAvatar
            src={avatarUrl}
            name={userName}
            size={80}
            frameColor={currentFrame || selectedFrame}
            borderWidth={4}
          />

          <div className="flex gap-4">
            {AVATAR_FRAME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedFrame(option.id)}
                title={option.label}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: option.color,
                  border:
                    selectedFrame === option.id
                      ? '3px solid white'
                      : '3px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  boxShadow: selectedFrame === option.id ? `0 0 0 2px ${option.color}` : 'none',
                }}
                aria-label={option.label}
              />
            ))}
          </div>

          <Button variant="secondary" disabled className="w-full">
            Скоро — €{AVATAR_FRAME_PRICE_EUR}
          </Button>
        </div>

        {currentFrame && (
          <p className="text-green-400 text-sm mt-4">
            ✓ Активная рамка: {AVATAR_FRAME_OPTIONS.find((o) => o.id === currentFrame)?.label}
          </p>
        )}
      </Surface>

      <Surface padding="md">
        <h2 className="ui-section-title mb-3 flex items-center gap-2">
          <i className="ti ti-info-circle ui-meta" />
          Об аналитике соцсетей
        </h2>
        <p className="ui-body text-sm leading-relaxed">
          Расширенная аналитика доступна для <strong>Telegram</strong> и{' '}
          <strong>YouTube</strong> через открытые API.
          Для <strong>Instagram</strong> и{' '}
          <strong>TikTok</strong> детальная статистика недоступна из‑за
          закрытых API — вы можете добавлять каналы и работать со сделками, но автоматические отчёты
          по охватам для этих платформ не генерируются.
        </p>
      </Surface>
    </div>
  )
}
