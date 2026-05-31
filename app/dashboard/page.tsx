'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<'creator' | 'advertiser'>('advertiser')
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
    setRole(role === 'creator' ? 'advertiser' : 'creator')
  }

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center">
      <div className="text-white/50">Загрузка...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex">

      {/* Сайдбар */}
      <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-2">
        <div className="text-white text-xl font-bold mb-8">
          Adver<span className="text-purple-400">Link</span>
        </div>

        {role === 'creator' ? (
          <>
            <SidebarItem icon="📺" label="Мои каналы" active />
            <SidebarItem icon="🛒" label="Маркетплейс" />
            <SidebarItem icon="📊" label="Статистика" />
            <SidebarItem icon="⭐" label="Отзывы" />
            <SidebarItem icon="⚙️" label="Настройки" />
          </>
        ) : (
          <>
            <SidebarItem icon="📋" label="Мои кампании" active />
            <SidebarItem icon="🛒" label="Маркетплейс" />
            <SidebarItem icon="📊" label="Статистика" />
            <SidebarItem icon="⭐" label="Отзывы" />
            <SidebarItem icon="⚙️" label="Настройки" />
          </>
        )}
      </aside>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col">

        {/* Топбар */}
        <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
          <input
            placeholder="Поиск..."
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 outline-none focus:border-purple-500 transition w-64 text-sm"
          />
          <div className="flex items-center gap-4">
            {/* Переключатель ролей */}
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

        {/* Контент */}
        <main className="flex-1 p-8">
          {role === 'creator' ? <CreatorDashboard /> : <AdvertiserDashboard />}
        </main>
      </div>
    </div>
  )
}

function SidebarItem({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <button className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition w-full text-left ${
      active
        ? 'bg-purple-600 text-white'
        : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`}>
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function CreatorDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Мои каналы</h1>
      <p className="text-white/50 mb-8">Управляй своими Telegram каналами</p>

      {/* Аналитика */}
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

      {/* Список каналов */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">📺</div>
        <div className="text-white font-medium mb-2">У тебя пока нет каналов</div>
        <div className="text-white/40 text-sm mb-6">Добавь свой первый Telegram канал</div>
        <button className="bg-purple-600 hover:bg-purple-500 transition text-white px-6 py-2.5 rounded-full text-sm font-medium">
          Добавить канал
        </button>
      </div>
    </div>
  )
}

function AdvertiserDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Мои кампании</h1>
      <p className="text-white/50 mb-8">Управляй рекламными кампаниями</p>

      {/* Аналитика */}
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

      {/* Пустое состояние */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">📢</div>
        <div className="text-white font-medium mb-2">У тебя пока нет кампаний</div>
        <div className="text-white/40 text-sm mb-6">Найди каналы в маркетплейсе и запусти первую рекламу</div>
        <button className="bg-purple-600 hover:bg-purple-500 transition text-white px-6 py-2.5 rounded-full text-sm font-medium">
          Перейти в маркетплейс
        </button>
      </div>
    </div>
  )
}