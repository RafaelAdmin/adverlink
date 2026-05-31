'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AddChannel() {
  const [form, setForm] = useState({
    name: '',
    telegram_username: '',
    description: '',
    category_id: '',
    language: 'ru',
    country: 'AM',
    subscriber_count: '',
    avg_views: '',
    ad_price: '',
    contact_telegram: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    setLoading(true)
    setMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { error } = await supabase.from('channels').insert({
      name: form.name,
      telegram_username: form.telegram_username.replace('@', ''),
      description: form.description,
      language: form.language,
      country: form.country,
      subscriber_count: parseInt(form.subscriber_count) || 0,
      avg_views: parseInt(form.avg_views) || 0,
      ad_price: parseFloat(form.ad_price) || 0,
      contact_telegram: form.contact_telegram,
      owner_id: user.id,
    })

    if (error) {
      setMessage('Ошибка: ' + error.message)
    } else {
      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] p-8">
      <div className="max-w-2xl mx-auto">

        <button
          onClick={() => router.push('/dashboard')}
          className="text-white/50 hover:text-white transition text-sm mb-8 flex items-center gap-2"
        >
          ← Назад
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">Добавить канал</h1>
        <p className="text-white/50 mb-8">Заполни информацию о своём Telegram канале</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-6">

          {/* Название */}
          <div>
            <label className="text-white/70 text-sm mb-2 block">Название канала *</label>
            <input
              placeholder="Например: Армянские новости"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-white/70 text-sm mb-2 block">Telegram username *</label>
            <input
              placeholder="@mychannel"
              value={form.telegram_username}
              onChange={(e) => setForm({ ...form, telegram_username: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Описание */}
          <div>
            <label className="text-white/70 text-sm mb-2 block">Описание</label>
            <textarea
              placeholder="О чём твой канал?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition resize-none"
            />
          </div>

          {/* Язык и страна */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/70 text-sm mb-2 block">Язык</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition"
              >
                <option value="ru">Русский</option>
                <option value="hy">Армянский</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="text-white/70 text-sm mb-2 block">Страна</label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition"
              >
                <option value="AM">Армения</option>
                <option value="RU">Россия</option>
                <option value="GE">Грузия</option>
              </select>
            </div>
          </div>

          {/* Подписчики и охваты */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/70 text-sm mb-2 block">Подписчиков</label>
              <input
                type="number"
                placeholder="10000"
                value={form.subscriber_count}
                onChange={(e) => setForm({ ...form, subscriber_count: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-2 block">Средние охваты</label>
              <input
                type="number"
                placeholder="3000"
                value={form.avg_views}
                onChange={(e) => setForm({ ...form, avg_views: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          {/* Цена и контакт */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/70 text-sm mb-2 block">Цена рекламы ($)</label>
              <input
                type="number"
                placeholder="50"
                value={form.ad_price}
                onChange={(e) => setForm({ ...form, ad_price: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-2 block">Контакт в Telegram</label>
              <input
                placeholder="@myusername"
                value={form.contact_telegram}
                onChange={(e) => setForm({ ...form, contact_telegram: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          {message && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {message}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.name || !form.telegram_username}
            className="bg-purple-600 hover:bg-purple-500 transition text-white py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Добавить канал'}
          </button>

        </div>
      </div>
    </div>
  )
}