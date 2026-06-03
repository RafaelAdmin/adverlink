'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  advertiserThemes,
  creatorThemes,
  getTheme,
  saveTheme,
} from '@/lib/theme'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'creator' | 'advertiser'>('advertiser')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [themeSaved, setThemeSaved] = useState(false)
  const [creatorThemeValue, setCreatorThemeValue] = useState('')
  const [advertiserThemeValue, setAdvertiserThemeValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const storedRole = localStorage.getItem('adverlink_role') as 'creator' | 'advertiser'
      setRole(storedRole || 'advertiser')
      setCreatorThemeValue(getTheme('creator').value)
      setAdvertiserThemeValue(getTheme('advertiser').value)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      setFullName(profile?.full_name || '')
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
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
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleThemeSelect = (themeRole: 'creator' | 'advertiser', themeValue: string) => {
    saveTheme(themeRole, themeValue)
    if (themeRole === 'creator') {
      setCreatorThemeValue(themeValue)
    } else {
      setAdvertiserThemeValue(themeValue)
    }
    setThemeSaved(true)
    setTimeout(() => setThemeSaved(false), 3000)
  }

  if (loading) {
    return <div className="text-white/50">Загрузка...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Настройки</h1>
      <p className="text-white/50 mb-8">Управляй профилем и аккаунтом</p>

      <form onSubmit={handleSave}>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-semibold text-lg mb-6">Профиль</h2>

          <label className="flex flex-col gap-2 mb-4">
            <span className="text-white/70 text-sm">Полное имя</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
            />
          </label>

          <label className="flex flex-col gap-2 mb-6">
            <span className="text-white/70 text-sm">Email</span>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/50 text-sm cursor-not-allowed"
            />
          </label>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          {success && <p className="text-green-400 text-sm mb-4">Сохранено!</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition text-white px-6 py-2.5 rounded-full text-sm font-medium"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold text-lg mb-6">Кастомизация</h2>

        <div className="mb-8">
          <h3 className="text-white/70 text-sm mb-4">Цвет для режима Создателя</h3>
          <div className="flex gap-4 flex-wrap">
            {creatorThemes.map((theme) => (
              <button
                key={theme.value}
                type="button"
                title={theme.name}
                onClick={() => handleThemeSelect('creator', theme.value)}
                style={{ backgroundColor: theme.accent }}
                className={`w-8 h-8 rounded-full transition ${
                  creatorThemeValue === theme.value
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent'
                    : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-white/70 text-sm mb-4">Цвет для режима Рекламодателя</h3>
          <div className="flex gap-4 flex-wrap">
            {advertiserThemes.map((theme) => (
              <button
                key={theme.value}
                type="button"
                title={theme.name}
                onClick={() => handleThemeSelect('advertiser', theme.value)}
                style={{ backgroundColor: theme.accent }}
                className={`w-8 h-8 rounded-full transition ${
                  advertiserThemeValue === theme.value
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent'
                    : ''
                }`}
              />
            ))}
          </div>
        </div>

        {themeSaved && <p className="text-green-400 text-sm mt-6">Сохранено!</p>}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold text-lg mb-6">Аккаунт</h2>
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-white/50 text-sm mb-1">Дата регистрации</div>
            <div className="text-white">
              {new Date(user.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
          <div>
            <div className="text-white/50 text-sm mb-1">Текущая роль</div>
            <div className="text-white">
              {role === 'creator' ? '🎨 Создатель' : '📢 Рекламодатель'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold text-lg mb-4">Опасная зона</h2>
        <button
          type="button"
          onClick={handleLogout}
          className="border border-red-500/30 text-red-400 hover:bg-red-500/10 transition px-5 py-2 rounded-full text-sm"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}
