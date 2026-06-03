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
  const [avatarUrl, setAvatarUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchSuccess, setFetchSuccess] = useState(false)
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
      avatar_url: avatarUrl || null,
      verification_status: 'pending',
      is_active: true,
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
        Введи username канала — мы автоматически подтянем данные из Telegram.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-5"
      >
        {/* Username + кнопка автозаполнения */}
        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Telegram username канала</span>
          <div className="flex gap-2">
            <input
              required
              value={telegramUsername}
              onChange={(e) => {
                setTelegramUsername(e.target.value)
                setFetchSuccess(false)
              }}
              placeholder="@channelname"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
            />
            <button
              type="button"
              onClick={fetchFromTelegram}
              disabled={fetching || !telegramUsername}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition text-white px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap"
            >
              {fetching ? 'Загрузка...' : '🔍 Найти'}
            </button>
          </div>
          {fetchSuccess && (
            <p className="text-green-400 text-xs">
              ✓ Данные успешно подтянуты из Telegram
            </p>
          )}
        </label>

        {/* Превью аватара */}
        {avatarUrl && (
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-14 h-14 rounded-full object-cover"
            />
            <div>
              <div className="text-white font-medium text-sm">{name}</div>
              <div className="text-white/40 text-xs mt-1">@{telegramUsername.replace('@', '')}</div>
              <div className="text-green-400 text-xs mt-1">✓ Аватар подтянут</div>
            </div>
          </div>
        )}

        {/* Название */}
        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Название канала</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Заполнится автоматически"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
          />
        </label>

        {/* Описание */}
        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Заполнится автоматически"
            rows={3}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm resize-none"
          />
        </label>

        {/* Подписчики и охваты */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-white/70 text-sm">Подписчиков</span>
            <input
              type="number"
              min={0}
              value={subscriberCount}
              onChange={(e) => setSubscriberCount(e.target.value)}
              placeholder="Подтянется автоматически"
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
              placeholder="Введи вручную"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
            />
          </label>
        </div>

        {/* Цена */}
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

        {/* Важное примечание */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <p className="text-yellow-400 text-xs">
            ⏳ После добавления канал будет на проверке. Зелёная галочка верификации появится после проверки администратором.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name || !telegramUsername}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition text-white px-6 py-2.5 rounded-full text-sm font-medium mt-2"
        >
          {submitting ? 'Сохранение...' : 'Добавить канал'}
        </button>
      </form>
    </div>
  )
}