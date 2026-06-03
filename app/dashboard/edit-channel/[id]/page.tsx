'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function EditChannelPage() {
  const [channel, setChannel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('id', params.id)
        .eq('owner_id', user.id)
        .single()

      if (!data) { router.push('/dashboard'); return }
      setChannel(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error } = await supabase
      .from('channels')
      .update({
        name: channel.name,
        description: channel.description,
        avg_views: Number(channel.avg_views),
        ad_price: Number(channel.ad_price),
        contact_telegram: channel.contact_telegram,
        language: channel.language,
        country: channel.country,
      })
      .eq('id', channel.id)

    setSaving(false)
    if (error) setError(error.message)
    else setSuccess(true)
  }

  if (loading) return (
    <div className="text-white/50 text-center py-24">Загрузка...</div>
  )

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/dashboard"
        className="text-white/50 hover:text-white transition text-sm mb-8 inline-flex items-center gap-2"
      >
        ← Назад к дашборду
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Редактировать канал</h1>
      <p className="text-white/50 mb-8 text-sm">Обнови информацию о своём канале</p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-5">

        {/* Аватар и название */}
        <div className="flex items-center gap-4 pb-4 border-b border-white/10">
          {channel.avatar_url ? (
            <img src={channel.avatar_url} alt={channel.name} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xl">
              {channel.name[0]}
            </div>
          )}
          <div>
            <div className="text-white font-semibold">{channel.name}</div>
            <div className="text-white/40 text-sm">@{channel.telegram_username}</div>
            <div className={`text-xs mt-1 ${
              channel.verification_status === 'verified' ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {channel.verification_status === 'verified' ? '✓ Верифицирован' : '⏳ На проверке'}
            </div>
          </div>
        </div>

        {/* Название */}
        <div className="flex flex-col gap-2">
          <label className="text-white/70 text-sm">Название канала</label>
          <input
            value={channel.name}
            onChange={(e) => setChannel({ ...channel, name: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
          />
        </div>

        {/* Описание */}
        <div className="flex flex-col gap-2">
          <label className="text-white/70 text-sm">Описание</label>
          <textarea
            value={channel.description || ''}
            onChange={(e) => setChannel({ ...channel, description: e.target.value })}
            rows={3}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm resize-none"
          />
        </div>

        {/* Охваты и цена */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-white/70 text-sm">Средние охваты</label>
            <input
              type="number"
              value={channel.avg_views || 0}
              onChange={(e) => setChannel({ ...channel, avg_views: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-white/70 text-sm">Цена рекламы ($)</label>
            <input
              type="number"
              value={channel.ad_price || 0}
              onChange={(e) => setChannel({ ...channel, ad_price: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
            />
          </div>
        </div>

        {/* Контакт */}
        <div className="flex flex-col gap-2">
          <label className="text-white/70 text-sm">Контакт в Telegram</label>
          <input
            value={channel.contact_telegram || ''}
            onChange={(e) => setChannel({ ...channel, contact_telegram: e.target.value })}
            placeholder="@username"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
          />
        </div>

        {/* Язык и страна */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-white/70 text-sm">Язык</label>
            <select
              value={channel.language || 'ru'}
              onChange={(e) => setChannel({ ...channel, language: e.target.value })}
              className="bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
            >
              <option value="ru">Русский</option>
              <option value="hy">Армянский</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-white/70 text-sm">Страна</label>
            <select
              value={channel.country || 'AM'}
              onChange={(e) => setChannel({ ...channel, country: e.target.value })}
              className="bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
            >
              <option value="AM">Армения</option>
              <option value="RU">Россия</option>
              <option value="GE">Грузия</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">✓ Изменения сохранены</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition text-white px-6 py-2.5 rounded-full text-sm font-medium"
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>
    </div>
  )
}