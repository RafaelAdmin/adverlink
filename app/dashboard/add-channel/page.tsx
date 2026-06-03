'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AddChannelPage() {
  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [telegramUsername, setTelegramUsername] = useState('')
  const [description, setDescription] = useState('')
  const [subscriberCount, setSubscriberCount] = useState('')
  const [avgViews, setAvgViews] = useState('')
  const [adPrice, setAdPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
    }
    getUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError(null)

    const username = telegramUsername.replace(/^@/, '').trim()

    const { error: insertError } = await supabase.from('channels').insert({
      owner_id: user.id,
      name: name.trim(),
      telegram_username: username,
      description: description.trim() || null,
      subscriber_count: subscriberCount ? Number(subscriberCount) : 0,
      avg_views: avgViews ? Number(avgViews) : 0,
      ad_price: adPrice ? Number(adPrice) : null,
      verification_status: 'pending',
      is_active: false,
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push('/dashboard')
  }

  if (!user) {
    return <div className="text-white/50">Загрузка...</div>
  }

  return (
    <div className="max-w-xl mx-auto">
        <Link
          href="/dashboard"
          className="text-white/50 hover:text-white transition text-sm mb-8 inline-flex items-center gap-2"
        >
          ← Назад к дашборду
        </Link>

        <h1 className="text-2xl font-bold text-white mb-2">Добавить канал</h1>
        <p className="text-white/50 mb-8 text-sm">
          Заполни данные о своём Telegram-канале. После проверки он появится в маркетплейсе.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-5"
        >
          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-sm">Название канала</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Tech Armenia"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-sm">Telegram username</span>
            <input
              required
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
              placeholder="channelname (без @)"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-sm">Описание</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Кратко о тематике канала"
              rows={3}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm resize-none"
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
                placeholder="0"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm">Средние охваты</span>
              <input
                type="number"
                min={0}
                value={avgViews}
                onChange={(e) => setAvgViews(e.target.value)}
                placeholder="0"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-sm">Цена рекламы (USD)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={adPrice}
              onChange={(e) => setAdPrice(e.target.value)}
              placeholder="50"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
            />
          </label>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition text-white px-6 py-2.5 rounded-full text-sm font-medium mt-2"
          >
            {submitting ? 'Сохранение...' : 'Добавить канал'}
          </button>
        </form>
    </div>
  )
}
