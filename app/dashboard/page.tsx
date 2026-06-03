'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'


export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<'creator' | 'advertiser'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('adverlink_role') as 'creator' | 'advertiser') || 'advertiser'
    }
    return 'advertiser'
  })
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

  const toggleRole = () => {
    const newRole = role === 'creator' ? 'advertiser' : 'creator'
    setRole(newRole)
    localStorage.setItem('adverlink_role', newRole)
  }

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center">
      <div className="text-white/50">Загрузка...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex">
      <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-2">
        <div className="text-white text-xl font-bold mb-8">
          Adver<span className="text-purple-400">Link</span>
        </div>
        {role === 'creator' ? (
          <>
            <SidebarItem icon="📺" label="Мои каналы" active />
            <SidebarItem icon="🛒" label="Маркетплейс" onClick={() => router.push('/marketplace')} />
            <SidebarItem icon="📊" label="Статистика" />
            <SidebarItem icon="⭐" label="Отзывы" />
            <SidebarItem icon="⚙️" label="Настройки" />
          </>
        ) : (
          <>
            <SidebarItem icon="📋" label="Мои кампании" active />
            <SidebarItem icon="🛒" label="Маркетплейс" onClick={() => router.push('/marketplace')} />
            <SidebarItem icon="📊" label="Статистика" />
            <SidebarItem icon="⭐" label="Отзывы" />
            <SidebarItem icon="⚙️" label="Настройки" />
          </>
        )}
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
          <input
            placeholder="Поиск..."
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 outline-none focus:border-purple-500 transition w-64 text-sm"
          />
          <div className="flex items-center gap-4">
            <button
              onClick={toggleRole}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white hover:border-purple-500 transition"
            >
              <span>{role === 'creator' ? '🎨 Создатель' : '📢 Рекламодатель'}</span>
              <span className="text-white/40">↔</span>
            </button>
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium hover:bg-purple-500 transition"
            >
              {user.email?.[0].toUpperCase()}
            </button>
          </div>
        </header>

        <main className="flex-1 p-8">
          {role === 'creator' ? <CreatorDashboard /> : <AdvertiserDashboard />}
        </main>
      </div>
    </div>
  )
}

function SidebarItem({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition w-full text-left ${
        active ? 'bg-purple-600 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function CreatorDashboard() {
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadChannels = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('owner_id', user.id)
      setChannels(data || [])
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
    </div>
  )
}

function AdvertiserDashboard() {
  const router = useRouter()
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
        <button
          onClick={() => router.push('/marketplace')}
          className="bg-purple-600 hover:bg-purple-500 transition text-white px-6 py-2.5 rounded-full text-sm font-medium"
        >
          Перейти в маркетплейс
        </button>
      </div>
    </div>
  )
}