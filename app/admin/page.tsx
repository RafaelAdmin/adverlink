'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState({ users: 0, channels: 0, requests: 0, newRequests: 0 })
  const [channels, setChannels] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        setIsAdmin(false)
        setLoading(false)
        setTimeout(() => router.push('/dashboard'), 2000)
        return
      }

      setIsAdmin(true)

      const [
        { count: usersCount },
        { count: channelsCount },
        { count: requestsCount },
        { count: newRequestsCount },
        { data: channelsData },
        { data: requestsData },
        { data: profilesData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('channels').select('*', { count: 'exact', head: true }),
        supabase.from('ad_requests').select('*', { count: 'exact', head: true }),
        supabase.from('ad_requests').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('channels').select('*').order('created_at', { ascending: false }),
        supabase.from('ad_requests').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ])

      setStats({
        users: usersCount || 0,
        channels: channelsCount || 0,
        requests: requestsCount || 0,
        newRequests: newRequestsCount || 0,
      })
      setChannels(channelsData || [])
      setRequests(requestsData || [])
      setProfiles(profilesData || [])
      setLoading(false)
    }
    load()
  }, [])

  const verifyChannel = async (id: string) => {
    await supabase.from('channels').update({
      verification_status: 'verified',
      is_verified: true,
    }).eq('id', id)
    setChannels(channels.map(ch => ch.id === id ? { ...ch, verification_status: 'verified', is_verified: true } : ch))
  }

  const rejectChannel = async (id: string) => {
    await supabase.from('channels').update({
      verification_status: 'rejected',
      is_verified: false,
    }).eq('id', id)
    setChannels(channels.map(ch => ch.id === id ? { ...ch, verification_status: 'rejected', is_verified: false } : ch))
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center">
      <div className="text-white/50">Загрузка...</div>
    </div>
  )

  if (!isAdmin) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🚫</div>
        <div className="text-white text-xl font-semibold mb-2">Доступ запрещён</div>
        <div className="text-white/50">Перенаправление...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] p-8">
      <div className="max-w-6xl mx-auto">

        {/* Шапка */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Админ-панель</h1>
            <p className="text-white/50 mt-1">Управление платформой AdverLink</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-white/50 hover:text-white transition text-sm flex items-center gap-2"
          >
            ← На главную
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Пользователей', value: stats.users },
            { label: 'Каналов', value: stats.channels },
            { label: 'Запросов', value: stats.requests },
            { label: 'Новых запросов', value: stats.newRequests },
          ].map((item) => (
            <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-3xl font-bold text-white mb-1">{item.value}</div>
              <div className="text-white/50 text-sm">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Каналы */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold">Модерация каналов</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/50 text-sm px-6 py-3">Канал</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Username</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Подписчики</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Статус</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => (
                  <tr key={ch.id} className="border-b border-white/5">
                    <td className="px-6 py-3 text-white text-sm">{ch.name}</td>
                    <td className="px-6 py-3 text-white/50 text-sm">@{ch.telegram_username}</td>
                    <td className="px-6 py-3 text-white text-sm">{ch.subscriber_count?.toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        ch.verification_status === 'verified'
                          ? 'bg-green-500/20 text-green-400'
                          : ch.verification_status === 'rejected'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {ch.verification_status === 'verified' ? '✓ Верифицирован'
                          : ch.verification_status === 'rejected' ? '✗ Отклонён'
                          : '⏳ На проверке'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => verifyChannel(ch.id)}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1 rounded-full text-xs transition"
                        >
                          Верифицировать
                        </button>
                        <button
                          onClick={() => rejectChannel(ch.id)}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded-full text-xs transition"
                        >
                          Отклонить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Пользователи */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold">Пользователи</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/50 text-sm px-6 py-3">ID</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Имя</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Дата</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Роль</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="px-6 py-3 text-white/50 text-xs font-mono">{p.id.slice(0, 8)}...</td>
                    <td className="px-6 py-3 text-white text-sm">{p.full_name || '—'}</td>
                    <td className="px-6 py-3 text-white/50 text-sm">
                      {new Date(p.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-3">
                      {p.is_admin && (
                        <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                          Админ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Запросы */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-white font-semibold">Последние запросы на рекламу</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/50 text-sm px-6 py-3">Рекламодатель</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Контакт</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Бюджет</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Статус</th>
                  <th className="text-left text-white/50 text-sm px-6 py-3">Дата</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="px-6 py-3 text-white text-sm">{r.advertiser_name}</td>
                    <td className="px-6 py-3 text-white/50 text-sm">{r.advertiser_contact}</td>
                    <td className="px-6 py-3 text-white text-sm">${r.budget}</td>
                    <td className="px-6 py-3">
                      <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-white/50 text-sm">
                      {new Date(r.created_at).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}