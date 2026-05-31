'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const categories = ['Все', 'Новости', 'Технологии', 'Бизнес', 'Спорт', 'Lifestyle', 'Юмор']

export default function Marketplace() {
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Все')
  const supabase = createClient()

  useEffect(() => {
    const loadChannels = async () => {
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setChannels(data || [])
      setLoading(false)
    }
    loadChannels()
  }, [])

  const filtered = channels.filter((ch) => {
    return ch.name.toLowerCase().includes(search.toLowerCase()) ||
      ch.telegram_username.toLowerCase().includes(search.toLowerCase())
  })

  const openTelegram = (username: string) => {
    window.open(`https://t.me/${username}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e]">
      <nav className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="text-white text-2xl font-bold tracking-tight">
          Adver<span className="text-purple-400">Link</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-white/70 hover:text-white transition px-4 py-2 text-sm">
            Dashboard
          </Link>
          <Link href="/auth/login" className="bg-purple-600 hover:bg-purple-500 transition text-white px-5 py-2 rounded-full text-sm font-medium">
            Войти
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-white mb-2">Каталог каналов</h1>
        <p className="text-white/50 mb-8">Найди подходящий Telegram-канал для рекламы</p>

        <input
          placeholder="Поиск по названию или username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition mb-6"
        />

        <div className="flex gap-3 mb-10 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                activeCategory === cat
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'border-white/20 text-white/70 hover:border-purple-500 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-white/50 text-center py-24">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <div className="text-white font-medium mb-2">Каналов не найдено</div>
            <div className="text-white/40 text-sm">Попробуй изменить параметры поиска</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((channel) => (
              <div key={channel.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {channel.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{channel.name}</div>
                    <div className="text-white/40 text-sm">@{channel.telegram_username}</div>
                  </div>
                  {channel.is_verified && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex-shrink-0">
                      ✓
                    </span>
                  )}
                </div>

                {channel.description && (
                  <p className="text-white/50 text-sm mb-4 line-clamp-2">{channel.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-white text-sm font-semibold">
                      {channel.subscriber_count >= 1000
                        ? `${(channel.subscriber_count / 1000).toFixed(1)}K`
                        : channel.subscriber_count}
                    </div>
                    <div className="text-white/40 text-xs">подписчиков</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-white text-sm font-semibold">
                      {channel.avg_views >= 1000
                        ? `${(channel.avg_views / 1000).toFixed(1)}K`
                        : channel.avg_views}
                    </div>
                    <div className="text-white/40 text-xs">охваты</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 text-center">
                    <div className="text-white text-sm font-semibold">{channel.engagement_rate || 0}%</div>
                    <div className="text-white/40 text-xs">вовлечённость</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-purple-400 font-semibold">
                    {channel.ad_price ? `от $${channel.ad_price}` : 'Цена по запросу'}
                  </div>
                  <button
                    onClick={() => openTelegram(channel.telegram_username)}
                    className="bg-purple-600 hover:bg-purple-500 transition text-white px-4 py-1.5 rounded-full text-sm"
                  >
                    Написать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}