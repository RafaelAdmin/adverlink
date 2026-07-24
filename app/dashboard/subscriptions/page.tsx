'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'

function FeatureItem({ included, children }: { included: boolean; children: React.ReactNode }) {
  return (
    <li className={`text-sm flex items-start gap-2 ${included ? 'text-white/80' : 'text-white/30'}`}>
      <span className={included ? 'text-green-400' : 'text-white/30'}>{included ? '✓' : '✗'}</span>
      {children}
    </li>
  )
}

function SoonButton({ label = 'Скоро' }: { label?: string }) {
  return (
    <button
      disabled
      className="opacity-50 cursor-not-allowed border border-white/20 text-white/50 rounded-full px-4 py-2 text-sm mt-4 w-full"
    >
      {label}
    </button>
  )
}

export default function SubscriptionsPage() {
  const { role } = useDashboard()
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', user.id)
        .single()

      setPlan(profile?.subscription_plan || 'free')
      setLoading(false)
    }
    load()
  }, [])

  const isPro = plan === 'pro'
  const isCreator = role === 'creator'

  if (loading) {
    return <div className="text-white/50">Загрузка...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Подписки</h1>
      <p className="text-white/50 mb-8">Управляй планом и дополнительными возможностями</p>

      {/* Section 1: My Plan */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-2">Мой план</h2>
        <p className="text-white/50 text-sm mb-6">
          Текущий план: <span className="text-white capitalize">{plan}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isCreator ? (
            <>
              <div className={`bg-white/5 border rounded-2xl p-6 ${!isPro ? 'border-white/10' : 'border-white/10 opacity-70'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-lg">Free Creator</h3>
                  <span className="text-white/50 text-sm">$0</span>
                </div>
                {!isPro && (
                  <span className="inline-block bg-white/10 text-white/60 text-xs px-3 py-1 rounded-full mb-4">
                    Текущий план
                  </span>
                )}
                <ul className="space-y-2">
                  <FeatureItem included>Профиль создателя</FeatureItem>
                  <FeatureItem included>Добавить каналы</FeatureItem>
                  <FeatureItem included>Получать запросы</FeatureItem>
                  <FeatureItem included>Базовая аналитика</FeatureItem>
                  <FeatureItem included={false}>Приоритет в поиске</FeatureItem>
                  <FeatureItem included={false}>Расширенная аналитика</FeatureItem>
                </ul>
                {!isPro ? (
                  <button disabled className="opacity-50 cursor-not-allowed border border-white/20 text-white/50 rounded-full px-4 py-2 text-sm mt-4 w-full">
                    Текущий план
                  </button>
                ) : (
                  <button disabled className="opacity-50 cursor-not-allowed btn-accent text-white rounded-full px-4 py-2 text-sm mt-4 w-full">
                    Перейти на Pro
                  </button>
                )}
              </div>

              <div className={`bg-white/5 border rounded-2xl p-6 ${isPro ? 'border-2 border-accent-strong' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-lg">Creator Pro</h3>
                  <span className="text-price-accent text-sm font-medium">$19/мес</span>
                </div>
                {isPro && (
                  <span className="inline-block badge-accent text-xs px-3 py-1 rounded-full mb-4">
                    ✓ Активен
                  </span>
                )}
                <ul className="space-y-2">
                  <FeatureItem included>Всё из Free</FeatureItem>
                  <FeatureItem included>Приоритет в результатах поиска</FeatureItem>
                  <FeatureItem included>Расширенная аналитика</FeatureItem>
                  <FeatureItem included>Премиум оформление профиля</FeatureItem>
                  <FeatureItem included>Значок Creator Pro</FeatureItem>
                  <FeatureItem included>Ранний доступ к функциям</FeatureItem>
                </ul>
                <SoonButton />
              </div>
            </>
          ) : (
            <>
              <div className={`bg-white/5 border rounded-2xl p-6 ${!isPro ? 'border-white/10' : 'border-white/10 opacity-70'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-lg">Free Advertiser</h3>
                  <span className="text-white/50 text-sm">$0</span>
                </div>
                {!isPro && (
                  <span className="inline-block bg-white/10 text-white/60 text-xs px-3 py-1 rounded-full mb-4">
                    Текущий план
                  </span>
                )}
                <ul className="space-y-2">
                  <FeatureItem included>Профиль рекламодателя</FeatureItem>
                  <FeatureItem included>Поиск каналов</FeatureItem>
                  <FeatureItem included>Отправка запросов</FeatureItem>
                  <FeatureItem included>Базовая статистика</FeatureItem>
                  <FeatureItem included={false}>Приоритетные запросы</FeatureItem>
                  <FeatureItem included={false}>Расширенная аналитика</FeatureItem>
                </ul>
                {!isPro ? (
                  <button disabled className="opacity-50 cursor-not-allowed border border-white/20 text-white/50 rounded-full px-4 py-2 text-sm mt-4 w-full">
                    Текущий план
                  </button>
                ) : (
                  <button disabled className="opacity-50 cursor-not-allowed btn-accent text-white rounded-full px-4 py-2 text-sm mt-4 w-full">
                    Перейти на Pro
                  </button>
                )}
              </div>

              <div className={`bg-white/5 border rounded-2xl p-6 ${isPro ? 'border-2 border-accent-strong' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-lg">Advertiser Pro</h3>
                  <span className="text-price-accent text-sm font-medium">$29/мес</span>
                </div>
                {isPro && (
                  <span className="inline-block badge-accent text-xs px-3 py-1 rounded-full mb-4">
                    ✓ Активен
                  </span>
                )}
                <ul className="space-y-2">
                  <FeatureItem included>Всё из Free</FeatureItem>
                  <FeatureItem included>Приоритетные запросы</FeatureItem>
                  <FeatureItem included>Расширенная аналитика</FeatureItem>
                  <FeatureItem included>Премиум оформление профиля</FeatureItem>
                  <FeatureItem included>Значок Advertiser Pro</FeatureItem>
                  <FeatureItem included>Ранний доступ к функциям</FeatureItem>
                </ul>
                <SoonButton />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Section 2: Promotion */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-2">Продвижение</h2>
        <p className="text-white/50 text-sm mb-6">Получи больше видимости в маркетплейсе</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="text-white font-semibold mb-1">Стандарт</h3>
            <p className="text-price-accent text-sm mb-4">$10/неделя</p>
            <ul className="text-white/60 text-sm space-y-1 text-left">
              <li>• Приоритет в поиске на 7 дней</li>
              <li>• +50% видимости</li>
            </ul>
            <SoonButton label="Активировать" />
          </div>

          <div className="bg-white/5 border-2 border-accent-strong rounded-2xl p-6 text-center relative">
            <span className="absolute top-4 right-4 btn-accent text-white text-xs px-2 py-0.5 rounded-full">
              Популярный
            </span>
            <div className="text-3xl mb-3">⭐</div>
            <h3 className="text-white font-semibold mb-1">Премиум</h3>
            <p className="text-price-accent text-sm mb-4">$25/неделя</p>
            <ul className="text-white/60 text-sm space-y-1 text-left">
              <li>• Топ позиция в поиске</li>
              <li>• +150% видимости</li>
              <li>• Значок «Продвигается»</li>
            </ul>
            <SoonButton label="Активировать" />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">💎</div>
            <h3 className="text-white font-semibold mb-1">VIP</h3>
            <p className="text-price-accent text-sm mb-4">$50/неделя</p>
            <ul className="text-white/60 text-sm space-y-1 text-left">
              <li>• Первая позиция</li>
              <li>• +300% видимости</li>
              <li>• Значок VIP</li>
              <li>• На главной странице</li>
            </ul>
            <SoonButton label="Активировать" />
          </div>
        </div>
      </section>

      {/* Section 3: Analytics */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-2">Аналитика</h2>
        <p className="text-white/50 text-sm mb-6">Расширенные инструменты для анализа</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Базовая аналитика</h3>
              <span className="text-green-400 text-sm">✓ Включено</span>
            </div>
            <ul className="text-white/60 text-sm space-y-2">
              <li>• Количество запросов</li>
              <li>• Статус верификации</li>
              <li>• История заказов</li>
            </ul>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Pro аналитика</h3>
              <span className="text-price-accent text-sm">$9/мес</span>
            </div>
            <ul className="text-white/60 text-sm space-y-2 mb-4">
              <li>• Детальная статистика охватов</li>
              <li>• Анализ аудитории</li>
              <li>• Сравнение с конкурентами</li>
              <li>• Экспорт данных</li>
            </ul>
            <SoonButton />
          </div>
        </div>
      </section>

      {/* Section 4: Custom badges */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-2">Кастомные значки</h2>
        <p className="text-white/50 text-sm mb-6">Персонализируй свой профиль уникальными значками</p>

        <div className="flex flex-wrap gap-4">
          {[
            { icon: '💜', name: 'Фиолетовая рамка', price: '$5 разово' },
            { icon: '🥇', name: 'Золотая рамка', price: '$8 разово' },
            { icon: '💎', name: 'Diamond Edition', price: '$15 разово' },
            { icon: '🏆', name: 'Founder Edition', price: 'Только для ранних пользователей' },
            { icon: '🎄', name: 'Сезонный значок', price: 'Появится в праздники', disabled: 'Недоступен' },
          ].map((badge) => (
            <div key={badge.name} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center w-36">
              <div className="text-3xl mb-2">{badge.icon}</div>
              <div className="text-white text-sm font-medium">{badge.name}</div>
              <div className="text-price-accent text-xs mt-1">{badge.price}</div>
              <button
                disabled
                className="opacity-50 cursor-not-allowed border border-white/20 text-white/50 rounded-full text-xs px-3 py-1 mt-2"
              >
                {badge.disabled || 'Скоро'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Payment history */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-white mb-2">История платежей</h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🧾</div>
          <p className="text-white font-medium mb-2">У вас пока нет платежей</p>
          <p className="text-white/50 text-sm">Все ваши транзакции появятся здесь</p>
        </div>
      </section>
    </div>
  )
}
