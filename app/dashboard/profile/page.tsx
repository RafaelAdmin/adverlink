'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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

      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('owner_id', user.id)

      setChannels(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center">
      <div className="text-white/50">Загрузка...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] p-8">
      <div className="max-w-3xl mx-auto">

        {/* Назад */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-white/50 hover:text-white transition text-sm mb-8 flex items-center gap-2"
        >
          ← Назад
        </button>

        {/* Профиль */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div>
              <div className="text-white text-xl font-semibold">{user.email}</div>
              <div className="text-white/40 text-sm mt-1">Участник с {new Date(user.created_at).toLocaleDateString('ru-RU')}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="border border-red-500/30 text-red-400 hover:bg-red-500/10 transition px-5 py-2 rounded-full text-sm"
          >
            Выйти из аккаунта
          </button>
        </div>

        {/* Мои каналы */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-semibold">Мои каналы</h2>
            <button
              onClick={() => router.push('/dashboard/add-channel')}
              className="bg-purple-600 hover:bg-purple-500 transition text-white px-5 py-2 rounded-full text-sm font-medium"
            >
              + Добавить канал
            </button>
          </div>

          {loading ? (
            <div className="text-white/50 text-center py-8">Загрузка...</div>
          ) : channels.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📺</div>
              <div className="text-white/50 text-sm">У тебя пока нет каналов</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {channels.map((channel) => (
                <div key={channel.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {channel.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">{channel.name}</div>
                    <div className="text-white/40 text-sm">@{channel.telegram_username}</div>
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

      </div>
    </div>
  )
}