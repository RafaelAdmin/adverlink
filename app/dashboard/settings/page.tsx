'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  accentColors,
  applySpaceAppearance,
  getAccentColor,
  getLayoutGradient,
  getSpaceThemeMode,
  saveAccentColor,
  saveSpaceThemeMode,
  type SpaceRole,
  type SpaceThemeMode,
} from '@/lib/theme'
import { useDashboard } from '../layout'
import CurrencySelector from '@/app/dashboard/components/CurrencySelector'
import { usePreferredCurrency } from '@/lib/usePreferredCurrency'
import PageHeader from '@/components/ui/PageHeader'
import Surface from '@/components/ui/Surface'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

function SpaceAppearanceBlock({
  spaceRole,
  label,
  activeRole,
}: {
  spaceRole: SpaceRole
  label: string
  activeRole: SpaceRole
}) {
  const [accent, setAccent] = useState(() => getAccentColor(spaceRole).value)
  const [themeMode, setThemeMode] = useState<SpaceThemeMode>(() => getSpaceThemeMode(spaceRole))
  const [previewGradient, setPreviewGradient] = useState(() => getLayoutGradient(spaceRole))

  useEffect(() => {
    setAccent(getAccentColor(spaceRole).value)
    setThemeMode(getSpaceThemeMode(spaceRole))
    setPreviewGradient(getLayoutGradient(spaceRole))
  }, [spaceRole, activeRole])

  const handleAccent = (colorValue: string) => {
    setAccent(colorValue)
    saveAccentColor(spaceRole, colorValue)
    setPreviewGradient(getLayoutGradient(spaceRole))
    if (activeRole === spaceRole) {
      applySpaceAppearance(spaceRole)
    }
    window.dispatchEvent(new Event('adverlink-accent-change'))
  }

  const handleTheme = (mode: SpaceThemeMode) => {
    setThemeMode(mode)
    saveSpaceThemeMode(spaceRole, mode)
    setPreviewGradient(getLayoutGradient(spaceRole))
    if (activeRole === spaceRole) {
      applySpaceAppearance(spaceRole)
    }
    window.dispatchEvent(new Event('adverlink-theme-change'))
  }

  const accentName = accentColors.find((c) => c.value === accent)?.name || accent

  return (
    <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <h3 className="ui-card-title mb-3">{label}</h3>
      <p className="ui-meta mb-3">Тема и акцент для этого режима</p>

      <p className="ui-meta mb-2">Тема</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(['dark', 'light'] as SpaceThemeMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleTheme(mode)}
            className={`ui-btn ui-btn--secondary ui-btn--md ${themeMode === mode ? 'border-accent' : ''}`}
            style={themeMode === mode ? { borderColor: 'var(--accent-primary)' } : undefined}
          >
            {mode === 'dark' ? '🌙 Тёмная' : '☀️ Светлая'}
          </button>
        ))}
      </div>

      <p className="ui-meta mb-2">Акцент</p>
      <div className="flex gap-2 flex-wrap mb-3">
        {accentColors.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => handleAccent(color.value)}
            title={color.name}
            style={{
              background: color.primary,
              boxShadow: accent === color.value ? `0 0 0 2px var(--surface-strong), 0 0 0 4px ${color.primary}` : 'none',
            }}
            className="w-8 h-8 transition-all duration-200 cursor-pointer border border-transparent"
          />
        ))}
      </div>

      <div
        className="h-10 w-full transition-all duration-500"
        style={{ background: previewGradient, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
      />
      <p className="ui-meta mt-2">Выбрано: {accentName}</p>
    </div>
  )
}

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
  const [notifications, setNotifications] = useState<Record<string, boolean>>({})
  const [preferredCurrency, setPreferredCurrency] = usePreferredCurrency()

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

  if (loading) {
    return (
      <div className="dashboard-form-inner">
        <div className="ui-meta">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-form-inner">
      <PageHeader title="Настройки" description="Управляй профилем и аккаунтом" />

      <section className="mb-6">
        <form onSubmit={handleSaveProfile}>
          <Surface padding="md">
            <h2 className="ui-section-title mb-4">Профиль</h2>

            <Input
              label="Полное имя"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mb-4"
            />

            <Input
              label="Email"
              type="email"
              value={user?.email || ''}
              disabled
              className="mb-4"
            />

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            {success && <p className="text-green-400 text-sm mb-4">✓ Сохранено!</p>}

            <Button type="submit" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </Surface>
        </form>
      </section>

      <section className="mb-6">
        <Surface padding="md">
          <h2 className="ui-section-title mb-4">Внешний вид</h2>

          <p className="ui-meta mb-2">Предпочитаемая валюта</p>
          <p className="ui-meta mb-3" style={{ fontSize: '0.75rem' }}>
            Все цены в маркетплейсе и на страницах каналов будут показаны в этой валюте.
          </p>
          <div className="mb-4">
            <CurrencySelector value={preferredCurrency} onChange={setPreferredCurrency} />
          </div>

          <SpaceAppearanceBlock spaceRole="creator" label="Пространство создателя" activeRole={role} />
          <SpaceAppearanceBlock spaceRole="advertiser" label="Пространство рекламодателя" activeRole={role} />
        </Surface>
      </section>

      <section className="mb-6">
        <Surface padding="md">
          <h2 className="ui-section-title mb-2">Банковские данные</h2>
          <p className="ui-meta mb-4">Для получения выплат за рекламу</p>

          <div className="dashboard-panel ui-meta mb-4" style={{ padding: '12px', background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)', color: 'var(--text)' }}>
            💳 Система выплат находится в разработке. Скоро вы сможете добавить банковские реквизиты и получать выплаты напрямую на карту.
          </div>

          <label className="ui-field mb-4">
            <span className="ui-field__label">Полное имя получателя</span>
            <input type="text" disabled className="ui-input opacity-50 cursor-not-allowed" />
          </label>

          <label className="ui-field mb-4">
            <span className="ui-field__label">Номер карты</span>
            <input type="text" placeholder="**** **** **** ****" disabled className="ui-input opacity-50 cursor-not-allowed" />
          </label>

          <label className="ui-field mb-4">
            <span className="ui-field__label">Банк</span>
            <select disabled className="ui-input opacity-50 cursor-not-allowed">
              <option>Ардшинбанк</option>
              <option>Амерабанк</option>
              <option>Идрам</option>
              <option>ACBA</option>
              <option>Конверс Банк</option>
              <option>Другой</option>
            </select>
          </label>

          <label className="ui-field mb-4">
            <span className="ui-field__label">IBAN</span>
            <input type="text" disabled className="ui-input opacity-50 cursor-not-allowed" />
          </label>

          <Button disabled className="opacity-50 cursor-not-allowed">Сохранить реквизиты</Button>
          <p className="ui-meta mt-3" style={{ fontSize: '11px' }}>Функция будет доступна в следующем обновлении</p>
        </Surface>
      </section>

      <section className="mb-6">
        <Surface padding="md">
          <h2 className="ui-section-title mb-4">Уведомления</h2>

          {notificationItems.map((item, i) => (
            <div
              key={item.key}
              className={`flex justify-between items-center py-3 ${
                i < notificationItems.length - 1 ? 'border-b' : ''
              }`}
              style={i < notificationItems.length - 1 ? { borderColor: 'var(--border-subtle)' } : undefined}
            >
              <span className="ui-body text-sm">{item.label}</span>
              <Toggle
                enabled={notifications[item.key] ?? item.default}
                onChange={() => toggleNotification(item.key)}
              />
            </div>
          ))}
        </Surface>
      </section>

      <section className="mb-6">
        <Surface padding="md">
          <h2 className="ui-section-title mb-4">Поддержка</h2>

          <div className="grid grid-cols-1 gap-2 mb-4">
            <button
              type="button"
              onClick={() => window.open('https://t.me/adverlink_support', '_blank')}
              className="ui-surface ui-surface--hover ui-surface--pad-sm flex items-center gap-3 cursor-pointer text-left w-full"
            >
              <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <i className="ti ti-brand-telegram" style={{ fontSize: '17px', color: '#60a5fa' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="ui-card-title">Telegram поддержка</div>
                <div className="ui-meta">@adverlink_support</div>
              </div>
              <span className="ui-meta">→</span>
            </button>

            <button
              type="button"
              onClick={() => window.open('mailto:support@adverlink.am')}
              className="ui-surface ui-surface--hover ui-surface--pad-sm flex items-center gap-3 cursor-pointer text-left w-full"
            >
              <div className="w-9 h-9 rounded-full bg-accent-muted-icon flex items-center justify-center flex-shrink-0">
                <i className="ti ti-mail" style={{ fontSize: '17px', color: 'var(--accent-primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="ui-card-title">Email поддержка</div>
                <div className="ui-meta">support@adverlink.am</div>
              </div>
              <span className="ui-meta">→</span>
            </button>

            <button
              type="button"
              onClick={() => window.open('/faq', '_blank')}
              className="ui-surface ui-surface--hover ui-surface--pad-sm flex items-center gap-3 cursor-pointer text-left w-full"
            >
              <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                <i className="ti ti-book" style={{ fontSize: '17px', color: '#4ade80' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="ui-card-title">FAQ и документация</div>
                <div className="ui-meta">Ответы на частые вопросы</div>
              </div>
              <span className="ui-meta">→</span>
            </button>
          </div>

          <div className="ui-surface ui-surface--pad-sm text-center">
            <p className="ui-meta">Среднее время ответа: 2-4 часа</p>
            <p className="ui-meta mt-1" style={{ fontSize: '11px' }}>Работаем: Пн-Пт 10:00 - 19:00 (GMT+4)</p>
          </div>
        </Surface>
      </section>

      <section className="mb-6">
        <h2 className="ui-section-title mb-3" style={{ color: 'var(--danger)' }}>Опасная зона</h2>
        <Surface padding="md" style={{ borderColor: 'color-mix(in srgb, var(--danger) 35%, var(--border))' }}>
          <div className="flex justify-between items-center pb-4 gap-4 flex-wrap" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div className="ui-card-title">Выйти из аккаунта</div>
              <div className="ui-meta">Вы будете перенаправлены на главную страницу</div>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="flex-shrink-0">Выйти</Button>
          </div>

          <div className="flex justify-between items-center pt-4 gap-4 flex-wrap">
            <div>
              <div className="ui-card-title" style={{ color: 'var(--danger)' }}>Удалить аккаунт</div>
              <div className="ui-meta">Это действие необратимо. Все данные будут удалены.</div>
            </div>
            <Button variant="danger" onClick={handleDeleteAccount} className="flex-shrink-0">Удалить</Button>
          </div>
        </Surface>
      </section>
    </div>
  )
}
