'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'

const categories = ['Все', 'Новости', 'Технологии', 'Бизнес', 'Спорт', 'Lifestyle', 'Юмор']

function AdRequestCard({ request }: { request: any }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold truncate">{request.advertiser_name}</div>
          <div className="text-white/40 text-sm mt-1 truncate">{request.advertiser_contact}</div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs flex-shrink-0 ${
          request.status === 'replied'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-purple-500/20 text-purple-400'
        }`}>
          {request.status === 'replied' ? 'Отвечено' : 'Новый'}
        </span>
      </div>
      <div className="text-purple-400 font-semibold mb-3">${request.budget}</div>
      <p className="text-white/70 text-sm mb-4 line-clamp-3">{request.message}</p>
      <div className="text-white/40 text-xs">
        {new Date(request.created_at).toLocaleDateString()}
      </div>
    </div>
  )
}

export default function DashboardMarketplacePage() {
  const { role } = useDashboard()
  const router = useRouter()
  const [channels, setChannels] = useState<any[]>([])
  const [myAdRequests, setMyAdRequests] = useState<any[]>([])
  const [allAdRequests, setAllAdRequests] = useState<any[]>([])
  const [creatorTab, setCreatorTab] = useState<'mine' | 'all'>('mine')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Все')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      if (role === 'advertiser') {
        const { data } = await supabase
          .from('channels')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        setChannels(data || [])
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setMyAdRequests([])
          setAllAdRequests([])
          setLoading(false)
          return
        }

        const { data: userChannels } = await supabase
          .from('channels')
          .select('id')
          .eq('owner_id', user.id)

        const channelIds = (userChannels || []).map((c) => c.id)

        if (channelIds.length > 0) {
          const { data: mine } = await supabase
            .from('ad_requests')
            .select('*')
            .in('channel_id', channelIds)
            .order('created_at', { ascending: false })
          setMyAdRequests(mine || [])
        } else {
          setMyAdRequests([])
        }

        const { data: all } = await supabase
          .from('ad_requests')
          .select('*')
          .order('created_at', { ascending: false })
        setAllAdRequests(all || [])
      }
      setLoading(false)
    }
    load()
  }, [role])

  const filtered = channels.filter((ch) => {
    return ch.name.toLowerCase().includes(search.toLowerCase()) ||
      ch.telegram_username.toLowerCase().includes(search.toLowerCase())
  })

  const creatorRequests = creatorTab === 'mine' ? myAdRequests : allAdRequests

  const filteredRequests = creatorRequests.filter((req) => {
    const q = search.toLowerCase()
    return (
      req.advertiser_name?.toLowerCase().includes(q) ||
      req.advertiser_contact?.toLowerCase().includes(q) ||
      req.message?.toLowerCase().includes(q)
    )
  })

  if (role === 'advertiser') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Каталог каналов</h1>
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
              <Link
                key={channel.id}
                href={`/dashboard/channel/${channel.id}`}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition cursor-pointer block"
              >
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
                  <Link
                    href={`/dashboard/add-channel/request-ad?channelId=${channel.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-purple-600 hover:bg-purple-500 transition text-white px-4 py-1.5 rounded-full text-sm"
                  >
                    Запросить рекламу
                  </Link>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Запросы рекламодателей</h1>
      <p className="text-white/50 mb-6">Рекламодатели ищут каналы для размещения рекламы</p>

      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setCreatorTab('mine')}
          className={`rounded-full px-4 py-2 text-sm transition ${
            creatorTab === 'mine'
              ? 'bg-purple-600 text-white'
              : 'border border-white/20 text-white/70'
          }`}
        >
          Мои запросы
        </button>
        <button
          onClick={() => setCreatorTab('all')}
          className={`rounded-full px-4 py-2 text-sm transition ${
            creatorTab === 'all'
              ? 'bg-purple-600 text-white'
              : 'border border-white/20 text-white/70'
          }`}
        >
          Запросы рекламодателей
        </button>
      </div>

      <input
        placeholder="Поиск по имени, контакту или сообщению..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition mb-10"
      />

      {loading ? (
        <div className="text-white/50 text-center py-24">Загрузка...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">📋</div>
          <div className="text-white font-medium mb-2">Запросов не найдено</div>
          <div className="text-white/40 text-sm">
            {creatorTab === 'mine' ? 'Пока нет запросов на ваши каналы' : 'Пока нет запросов от рекламодателей'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((request) => (
            <AdRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  )
}
