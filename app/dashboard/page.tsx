'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useDashboard } from './layout'

export default function DashboardPage() {
  const { role } = useDashboard()
  return role === 'creator' ? <CreatorDashboard /> : <AdvertiserDashboard />
}

function CreatorDashboard() {
  const [channels, setChannels] = useState<any[]>([])
  const [adRequests, setAdRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadChannels = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('owner_id', user.id)
      const channelData = data || []
      setChannels(channelData)

      if (channelData.length > 0) {
        const channelIds = channelData.map((c) => c.id)
        const { data: requests } = await supabase
          .from('ad_requests')
          .select('*')
          .in('channel_id', channelIds)
          .order('created_at', { ascending: false })
        setAdRequests(requests || [])
      } else {
        setAdRequests([])
      }

      setLoading(false)
    }
    loadChannels()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Мои каналы</h1>
        <Link
          href="/dashboard/add-channel"
          className="bg-purple-600 hover:bg-purple-500 transition text-white px-5 py-2 rounded-full text-sm font-medium"
        >
          + Добавить канал
        </Link>
      </div>
      <p className="text-white/50 mb-8">Управляй своими Telegram каналами</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Постов в этом месяце', value: '0' },
          { label: 'Рост подписчиков', value: '0' },
          { label: 'Рекламных постов', value: '0' },
        ].map((item) => (
          <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-3xl font-bold text-white mb-1">{item.value}</div>
            <div className="text-white/50 text-sm">{item.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-white/50 text-center py-12">Загрузка...</div>
      ) : channels.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">📺</div>
          <div className="text-white font-medium mb-2">У тебя пока нет каналов</div>
          <div className="text-white/40 text-sm mb-6">Добавь свой первый Telegram канал</div>
          <Link
            href="/dashboard/add-channel"
            className="bg-purple-600 hover:bg-purple-500 transition text-white px-6 py-2.5 rounded-full text-sm font-medium"
          >
            Добавить канал
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {channels.map((channel) => (
            <div key={channel.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-6 hover:border-purple-500/50 transition">
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {channel.name[0]}
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">{channel.name}</div>
                <div className="text-white/40 text-sm">@{channel.telegram_username}</div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <div className="text-white font-semibold">{channel.subscriber_count?.toLocaleString()}</div>
                  <div className="text-white/40 text-xs">подписчиков</div>
                </div>
                <div>
                  <div className="text-white font-semibold">{channel.avg_views?.toLocaleString()}</div>
                  <div className="text-white/40 text-xs">охваты</div>
                </div>
                <div>
                  <div className="text-purple-400 font-semibold">${channel.ad_price}</div>
                  <div className="text-white/40 text-xs">цена</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs ${
                channel.verification_status === 'verified'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {channel.verification_status === 'verified' ? '✓ Верифицирован' : '⏳ На проверке'}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-bold text-white mb-4">Входящие запросы на рекламу</h2>
        {adRequests.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/50">
            Пока нет запросов
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {adRequests.map((request) => (
              <div key={request.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-white font-semibold">{request.advertiser_name}</div>
                    <div className="text-white/40 text-sm mt-1">{request.advertiser_contact}</div>
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
                <p className="text-white/70 text-sm mb-3">{request.message}</p>
                <div className="text-white/40 text-xs">
                  {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AdvertiserDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Мои кампании</h1>
      <p className="text-white/50 mb-8">Управляй рекламными кампаниями</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Активных кампаний', value: '0' },
          { label: 'Завершённых сделок', value: '0' },
          { label: 'Потрачено', value: '$0' },
        ].map((item) => (
          <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="text-3xl font-bold text-white mb-1">{item.value}</div>
            <div className="text-white/50 text-sm">{item.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">📢</div>
        <div className="text-white font-medium mb-2">У тебя пока нет кампаний</div>
        <div className="text-white/40 text-sm mb-6">Найди каналы в маркетплейсе и запусти первую рекламу</div>
        <Link
          href="/dashboard/marketplace"
          className="bg-purple-600 hover:bg-purple-500 transition text-white px-6 py-2.5 rounded-full text-sm font-medium inline-block"
        >
          Перейти в маркетплейс
        </Link>
      </div>
    </div>
  )
}
