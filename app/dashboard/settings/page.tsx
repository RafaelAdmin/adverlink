'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { accentColors, applyAccentColor, getAccentColor, saveAccentColor } from '@/lib/theme'
import { useDashboard } from '../layout'
import CurrencySelector from '@/app/dashboard/components/CurrencySelector'
import { CurrencyCode } from '@/lib/currency'
import { usePreferredCurrency } from '@/lib/usePreferredCurrency'

const notificationItems = [
  { key: 'adverlink_notify_new_requests', label: 'Новые запросы на рекламу', default: true },
  { key: 'adverlink_notify_order_status', label: 'Статус выполнения заказа', default: true },
  { key: 'adverlink_notify_reviews', label: 'Новые отзывы', default: true },
  { key: 'adverlink_notify_platform', label: 'Обновления платформы', default: false },
  { key: 'adverlink_notify_marketing', label: 'Маркетинговые рассылки', default: false },
]

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-colors duration-200"
      style={{ background: enabled ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { role } = useDashboard()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState(() => getAccentColor(role).value)
  const [previewGradient, setPreviewGradient] = useState(() => getAccentColor(role).gradientRaw)
  const [notifications, setNotifications] = useState<Record<string, boolean>>({})
  const [preferredCurrency, setPreferredCurrency] = usePreferredCurrency()

  useEffect(() => {
    const color = getAccentColor(role)
    setSelectedColor(color.value)
    setPreviewGradient(color.gradientRaw)
  }, [role])

  useEffect(() => {
    const notifState: Record<string, boolean> = {}
    notificationItems.forEach((item) => {
      const stored = localStorage.getItem(item.key)
      notifState[item.key] = stored === null ? item.default : stored === 'true'
    })
    setNotifications(notifState)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/auth/login')
        return
      }
      setUser(authUser)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setFullName(profile?.full_name || '')
      setLoading(false)
    }
    load()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const handleColorSelect = (colorValue: string) => {
    setSelectedColor(colorValue)
    saveAccentColor(role, colorValue)
    const colorObj = accentColors.find((c) => c.value === colorValue)
    if (colorObj) {
      applyAccentColor(colorObj)
      setPreviewGradient(colorObj.gradientRaw)
      window.dispatchEvent(new Event('adverlink-accent-change'))
    }
  }

  const toggleNotification = (key: string) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(key, String(next[key]))
      return next
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      'Вы уверены? Это действие необратимо. Все ваши каналы и данные будут удалены.',
    )
    if (!confirmed) return
    const confirmed2 = window.confirm('Последнее предупреждение! Удалить аккаунт навсегда?')
    if (confirmed2) {
      alert('Функция удаления аккаунта будет доступна скоро. Для удаления аккаунта напишите нам: support@adverlink.am')
    }
  }

  const currentColorName = accentColors.find((c) => c.value === selectedColor)?.name || 'Фиолетовый'

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-white/50">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Настройки</h1>
      <p className="text-white/50 mb-8">Управляй профилем и аккаунтом</p>

      {/* Section 1: Профиль */}
      <section className="mb-8">
        <form onSubmit={handleSaveProfile}>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Профиль</h2>

            <label className="block mb-4">
              <span className="text-white/70 text-sm mb-2 block">Полное имя</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition text-sm w-full"
              />
            </label>

            <label className="block mb-6">
              <span className="text-white/70 text-sm mb-2 block">Email</span>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition text-sm w-full opacity-50 cursor-not-allowed"
              />
            </label>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            {success && <p className="text-green-400 text-sm mb-4">✓ Сохранено!</p>}

            <button
              type="submit"
              disabled={saving}
              className="btn-accent disabled:opacity-50 text-white px-6 py-2.5 rounded-full text-sm font-medium transition"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </section>

      {/* Section 2: Кастомизация интерфейса */}
      <section className="mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Кастомизация интерфейса</h2>

          <p className="text-white/50 text-sm mb-3">Предпочитаемая валюта</p>
          <p className="text-white/40 text-xs mb-4">
            Все цены в маркетплейсе и на страницах каналов будут показаны в этой валюте.
            Исходная цена канала в базе данных не меняется.
          </p>
          <div className="mb-8">
            <CurrencySelector value={preferredCurrency} onChange={setPreferredCurrency} />
          </div>

          <p className="text-white/50 text-sm mb-1">Цвет акцента</p>
          <p className="text-white/40 text-xs mb-0">
            {role === 'creator' ? 'для режима Создателя' : 'для режима Рекламодателя'}
          </p>
          <div className="flex gap-3 flex-wrap mt-4">
            {accentColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleColorSelect(color.value)}
                title={color.name}
                style={{
                  background: color.primary,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  boxShadow:
                    selectedColor === color.value
                      ? `0 0 0 3px white, 0 0 0 5px ${color.primary}`
                      : 'none',
                  transform: selectedColor === color.value ? 'scale(1.15)' : 'scale(1)',
                }}
                className="w-10 h-10 rounded-full transition-all duration-200 cursor-pointer border border-white/20"
              />
            ))}
          </div>
          {previewGradient && (
            <div
              className="mt-4 h-12 rounded-xl w-full transition-all duration-500"
              style={{
                background: previewGradient,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          )}
          <p className="text-white/40 text-xs mt-3">
            Выбран: {currentColorName}
            {' — '}
            {role === 'creator' ? 'режим Создателя' : 'режим Рекламодателя'}
          </p>

          <p className="text-white/50 text-sm mb-4 mt-6">Тема интерфейса</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border rounded-xl p-4 flex items-center gap-3" style={{ borderColor: 'var(--accent-primary)' }}>
              <span className="text-2xl">🌙</span>
              <div>
                <div className="text-white font-medium text-sm">Тёмная</div>
                <div className="text-white/40 text-xs">Активна</div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 opacity-50 cursor-not-allowed">
              <span className="text-2xl">☀️</span>
              <div>
                <div className="text-white font-medium text-sm">Светлая (скоро)</div>
                <div className="text-white/40 text-xs">В разработке</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Банковские данные */}
      <section className="mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Банковские данные</h2>
          <p className="text-white/50 text-sm mb-6">Для получения выплат за рекламу</p>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <p className="text-blue-300 text-sm">
              💳 Система выплат находится в разработке. Скоро вы сможете добавить банковские реквизиты и получать выплаты напрямую на карту.
            </p>
          </div>

          <label className="block mb-4">
            <span className="text-white/70 text-sm mb-2 block">Полное имя получателя</span>
            <input
              type="text"
              disabled
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition text-sm w-full opacity-50 cursor-not-allowed"
            />
          </label>

          <label className="block mb-4">
            <span className="text-white/70 text-sm mb-2 block">Номер карты</span>
            <input
              type="text"
              placeholder="**** **** **** ****"
              disabled
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition text-sm w-full opacity-50 cursor-not-allowed"
            />
          </label>

          <label className="block mb-4">
            <span className="text-white/70 text-sm mb-2 block">Банк</span>
            <select
              disabled
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none transition text-sm w-full opacity-50 cursor-not-allowed"
            >
              <option>Ардшинбанк</option>
              <option>Амерабанк</option>
              <option>Идрам</option>
              <option>ACBA</option>
              <option>Конверс Банк</option>
              <option>Другой</option>
            </select>
          </label>

          <label className="block mb-6">
            <span className="text-white/70 text-sm mb-2 block">IBAN</span>
            <input
              type="text"
              disabled
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none transition text-sm w-full opacity-50 cursor-not-allowed"
            />
          </label>

          <button
            type="button"
            disabled
            className="btn-accent text-white px-6 py-2.5 rounded-full text-sm font-medium opacity-50 cursor-not-allowed"
          >
            Сохранить реквизиты
          </button>
          <p className="text-white/30 text-xs mt-3">Функция будет доступна в следующем обновлении</p>
        </div>
      </section>

      {/* Section 4: Уведомления */}
      <section className="mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Уведомления</h2>

          {notificationItems.map((item, i) => (
            <div
              key={item.key}
              className={`flex justify-between items-center py-3 ${
                i < notificationItems.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              <span className="text-white text-sm">{item.label}</span>
              <Toggle
                enabled={notifications[item.key] ?? item.default}
                onChange={() => toggleNotification(item.key)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Поддержка */}
      <section className="mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Поддержка</h2>

          <div className="grid grid-cols-1 gap-3 mb-4">
            <button
              type="button"
              onClick={() => window.open('https://t.me/adverlink_support', '_blank')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover-border-accent transition text-left w-full"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <i className="ti ti-brand-telegram" style={{ fontSize: '18px', color: '#60a5fa' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">Telegram поддержка</div>
                <div className="text-white/40 text-sm">@adverlink_support</div>
              </div>
              <span className="text-white/40">→</span>
            </button>

            <button
              type="button"
              onClick={() => window.open('mailto:support@adverlink.am')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover-border-accent transition text-left w-full"
            >
              <div className="w-10 h-10 rounded-full bg-accent-muted-icon flex items-center justify-center flex-shrink-0">
                <i className="ti ti-mail" style={{ fontSize: '18px', color: '#a78bfa' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">Email поддержка</div>
                <div className="text-white/40 text-sm">support@adverlink.am</div>
              </div>
              <span className="text-white/40">→</span>
            </button>

            <button
              type="button"
              onClick={() => window.open('/faq', '_blank')}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover-border-accent transition text-left w-full"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <i className="ti ti-book" style={{ fontSize: '18px', color: '#4ade80' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">FAQ и документация</div>
                <div className="text-white/40 text-sm">Ответы на частые вопросы</div>
              </div>
              <span className="text-white/40">→</span>
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-white/50 text-sm">Среднее время ответа: 2-4 часа</p>
            <p className="text-white/30 text-xs mt-1">Работаем: Пн-Пт 10:00 - 19:00 (GMT+4)</p>
          </div>
        </div>
      </section>

      {/* Section 6: Опасная зона */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-red-400 mb-6">Опасная зона</h2>
        <div className="bg-white/5 border border-red-500/20 rounded-2xl p-6">
          <div className="flex justify-between items-center pb-4 border-b border-white/10 gap-4 flex-wrap">
            <div>
              <div className="text-white font-medium">Выйти из аккаунта</div>
              <div className="text-white/40 text-sm">Вы будете перенаправлены на главную страницу</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="border border-white/20 text-white hover:bg-white/5 rounded-full px-4 py-2 text-sm transition flex-shrink-0"
            >
              Выйти
            </button>
          </div>

          <div className="flex justify-between items-center pt-4 gap-4 flex-wrap">
            <div>
              <div className="text-red-400 font-medium">Удалить аккаунт</div>
              <div className="text-white/40 text-sm">Это действие необратимо. Все данные будут удалены.</div>
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-full px-4 py-2 text-sm transition flex-shrink-0"
            >
              Удалить
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
