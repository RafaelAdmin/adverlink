'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'
import SubscriptionPaymentModal from '../components/SubscriptionPaymentModal'
import {
  FREE_CAMPAIGN_LIMIT,
  FREE_CHANNEL_LIMIT,
  PRO_PRICE_EUR,
  isProPlan,
} from '@/lib/subscriptions'

function FeatureItem({ included, children }: { included: boolean; children: React.ReactNode }) {
  return (
    <li className={`text-sm flex items-start gap-2 ${included ? 'text-white/80' : 'text-white/30'}`}>
      <span className={included ? 'text-green-400' : 'text-white/30'}>{included ? '✓' : '✗'}</span>
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

export default function SubscriptionsPage() {
  const { role, isPro, refreshPlan } = useDashboard()
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, is_admin')
        .eq('id', user.id)
        .single()

      setPlan(isProPlan(profile?.subscription_plan, profile?.is_admin) ? 'pro' : 'free')
      setLoading(false)
    }
    load()
  }, [isPro])

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
      if (!res.ok) throw new Error(data.error || 'Ошибка оплаты')
      setPlan('pro')
      refreshPlan?.()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка оплаты')
      return false
    } finally {
      setSubscribing(false)
    }
  }

  const proFeatures = role === 'creator' ? PRO_CREATOR_FEATURES : PRO_ADVERTISER_FEATURES
  const activePro = plan === 'pro' || isPro

  if (loading) {
    return <div className="text-white/50">Загрузка...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
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

      <h1 className="text-2xl font-bold text-white mb-2">Подписки</h1>
      <p className="text-white/50 mb-8">
        {role === 'creator'
          ? 'Управляй каналами и получай больше заказов с Pro'
          : 'Запускай больше кампаний и отслеживай расходы с Pro'}
      </p>

      {activePro && (
        <div className="mb-8 rounded-2xl p-5 border-2 border-accent-strong bg-white/5 flex items-center gap-4">
          <span className="text-3xl">★</span>
          <div>
            <p className="text-white font-semibold">Pro активен</p>
            <p className="text-white/50 text-sm">Все Pro-функции доступны</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className={`bg-white/5 border rounded-2xl p-6 ${!activePro ? 'border-white/20' : 'border-white/10 opacity-80'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg">Free</h3>
            <span className="text-white/50 text-sm">€0</span>
          </div>
          {!activePro && (
            <span className="inline-block bg-white/10 text-white/60 text-xs px-3 py-1 rounded-full mb-4">
              Текущий план
            </span>
          )}
          <ul className="space-y-2 mb-6">
            {FREE_FEATURES.map((f) => (
              <FeatureItem key={f} included>{f}</FeatureItem>
            ))}
          </ul>
          <button
            disabled
            className="w-full border border-white/20 text-white/40 rounded-full px-4 py-2.5 text-sm cursor-not-allowed"
          >
            {!activePro ? 'Текущий план' : 'Free'}
          </button>
        </div>

        <div className={`bg-white/5 border rounded-2xl p-6 relative ${activePro ? 'border-2 border-accent-strong' : 'border-white/10'}`}>
          {!activePro && (
            <span className="absolute -top-3 right-4 btn-accent text-white text-xs px-3 py-1 rounded-full">
              Рекомендуем
            </span>
          )}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
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
            <button
              type="button"
              onClick={() => setShowPayment(true)}
              className="btn-accent w-full text-white rounded-full px-4 py-2.5 text-sm font-medium"
            >
              Перейти на Pro — €{PRO_PRICE_EUR}/мес
            </button>
          ) : (
            <button disabled className="w-full border border-white/20 text-white/50 rounded-full px-4 py-2.5 text-sm cursor-not-allowed">
              Pro активен
            </button>
          )}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <i className="ti ti-info-circle text-white/50" />
          Об аналитике соцсетей
        </h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Расширенная аналитика доступна для <strong className="text-white/80">Telegram</strong> и{' '}
          <strong className="text-white/80">YouTube</strong> через открытые API.
          Для <strong className="text-white/80">Instagram</strong> и{' '}
          <strong className="text-white/80">TikTok</strong> детальная статистика недоступна из‑за
          закрытых API — вы можете добавлять каналы и работать со сделками, но автоматические отчёты
          по охватам для этих платформ не генерируются.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Сравнение лимитов</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-left border-b border-white/10">
                <th className="pb-3 pr-4 font-medium">Функция</th>
                <th className="pb-3 pr-4 font-medium">Free</th>
                <th className="pb-3 font-medium">Pro</th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4">Каналы</td>
                <td className="py-3 pr-4">{FREE_CHANNEL_LIMIT}</td>
                <td className="py-3 text-green-400">∞</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4">Кампании / месяц</td>
                <td className="py-3 pr-4">{FREE_CAMPAIGN_LIMIT}</td>
                <td className="py-3 text-green-400">∞</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4">Сделки</td>
                <td className="py-3 pr-4 text-green-400">∞</td>
                <td className="py-3 text-green-400">∞</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 pr-4">Отзывы</td>
                <td className="py-3 pr-4 text-green-400">∞</td>
                <td className="py-3 text-green-400">∞</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Отчёты за период</td>
                <td className="py-3 pr-4 text-white/30">—</td>
                <td className="py-3 text-green-400">Excel / PDF</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
