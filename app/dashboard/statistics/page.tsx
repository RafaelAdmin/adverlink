'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function MetricCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-white/50 text-sm">{label}</div>
    </div>
  )
}

function RecentRequestRow({ request }: { request: any }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{request.advertiser_name}</div>
        <div className="text-white/40 text-xs mt-1">
          {new Date(request.created_at).toLocaleDateString('ru-RU')}
        </div>
      </div>
      <div className="text-purple-400 font-semibold flex-shrink-0">${request.budget}</div>
    </div>
  )
}

export default function StatisticsPage() {
  const [role, setRole] = useState<'creator' | 'advertiser'>('advertiser')
  const [loading, setLoading] = useState(true)
  const [creatorStats, setCreatorStats] = useState({
    channelCount: 0,
    totalSubscribers: 0,
    totalRequests: 0,
    newRequests: 0,
    recentRequests: [] as any[],
  })
  const [advertiserStats, setAdvertiserStats] = useState({
    totalSent: 0,
    pending: 0,
    totalBudget: 0,
    recentRequests: [] as any[],
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const storedRole = (localStorage.getItem('adverlink_role') as 'creator' | 'advertiser') || 'advertiser'
      setRole(storedRole)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      if (storedRole === 'creator') {
        const { data: channels } = await supabase
          .from('channels')
          .select('id, subscriber_count')
          .eq('owner_id', user.id)

        const channelList = channels || []
        const channelIds = channelList.map((c) => c.id)
        const totalSubscribers = channelList.reduce(
          (sum, c) => sum + (c.subscriber_count ?? 0),
          0
        )

        let adRequests: any[] = []
        if (channelIds.length > 0) {
          const { data } = await supabase
            .from('ad_requests')
            .select('*')
            .in('channel_id', channelIds)
            .order('created_at', { ascending: false })
          adRequests = data || []
        }

        setCreatorStats({
          channelCount: channelList.length,
          totalSubscribers,
          totalRequests: adRequests.length,
          newRequests: adRequests.filter((r) => r.status === 'new').length,
          recentRequests: adRequests.slice(0, 5),
        })
      } else {
        const { data: byAdvertiser, error: advertiserError } = await supabase
          .from('ad_requests')
          .select('*')
          .eq('advertiser_id', user.id)
          .order('created_at', { ascending: false })

        let adRequests: any[] = []

        if (advertiserError) {
          const { data: all } = await supabase
            .from('ad_requests')
            .select('*')
            .order('created_at', { ascending: false })
          adRequests = all || []
        } else {
          adRequests = byAdvertiser || []
        }

        setAdvertiserStats({
          totalSent: adRequests.length,
          pending: adRequests.filter((r) => r.status === 'new').length,
          totalBudget: adRequests.reduce((sum, r) => sum + (Number(r.budget) || 0), 0),
          recentRequests: adRequests.slice(0, 5),
        })
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-white/50">Загрузка...</div>
  }

  if (role === 'creator') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Статистика</h1>
        <p className="text-white/50 mb-8">Обзор ваших каналов и входящих запросов</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <MetricCard value={creatorStats.channelCount} label="Всего каналов" />
          <MetricCard value={creatorStats.totalSubscribers.toLocaleString()} label="Всего подписчиков" />
          <MetricCard value={creatorStats.totalRequests} label="Входящих запросов" />
          <MetricCard value={creatorStats.newRequests} label="Новых запросов" />
        </div>

        <h2 className="text-white font-semibold text-lg mb-4">Последние запросы</h2>
        {creatorStats.recentRequests.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/50 text-sm">
            Пока нет входящих запросов
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {creatorStats.recentRequests.map((request) => (
              <RecentRequestRow key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Статистика</h1>
      <p className="text-white/50 mb-8">Обзор ваших рекламных запросов</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <MetricCard value={advertiserStats.totalSent} label="Отправлено запросов" />
        <MetricCard value={advertiserStats.pending} label="Ожидают ответа" />
        <MetricCard value={`$${advertiserStats.totalBudget.toLocaleString()}`} label="Общий бюджет" />
      </div>

      <h2 className="text-white font-semibold text-lg mb-4">Последние запросы</h2>
      {advertiserStats.recentRequests.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/50 text-sm">
          Вы ещё не отправляли запросов
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {advertiserStats.recentRequests.map((request) => (
            <RecentRequestRow key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  )
}
