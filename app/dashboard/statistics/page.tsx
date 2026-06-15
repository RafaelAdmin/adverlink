'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'
import { formatAmdWithUsd } from '@/lib/currency'

function safeNum(n: unknown, fallback = 0): number {
  const v = Number(n)
  return Number.isFinite(v) ? v : fallback
}

function buildMonthlyChart(items: { created_at: string; [key: string]: unknown }[], valueKey: string) {
  const result: { month: string; value: number }[] = []
  const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const month = d.getMonth()
    const year = d.getFullYear()

    const value = items
      .filter((item) => {
        const itemDate = new Date(item.created_at)
        return itemDate.getMonth() === month && itemDate.getFullYear() === year
      })
      .reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0)

    result.push({ month: monthNames[month], value })
  }

  return result
}

function SubMetric({ label, value, className = 'text-white' }: { label: string; value: string | number; className?: string }) {
  return (
    <div>
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-xl font-bold ${className}`}>{value}</div>
    </div>
  )
}

function BigMetricCard({
  title,
  iconClass,
  borderClass = 'border-white/10',
  children,
  cols = 2,
}: {
  title: string
  iconClass: string
  borderClass?: string
  children: React.ReactNode
  cols?: 2 | 3
}) {
  return (
    <div className={`border ${borderClass} rounded-2xl p-6 relative overflow-hidden`} style={{
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      <i
        className={`ti ${iconClass}`}
        style={{
          fontSize: '36px',
          opacity: 0.15,
          position: 'absolute',
          right: '16px',
          top: '16px',
          color: 'white',
        }}
      />
      <div className="text-white/50 text-sm font-medium mb-4">{title}</div>
      <div className={`grid gap-4 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>{children}</div>
    </div>
  )
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 h-36 animate-pulse" />
      ))}
      <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 h-64 animate-pulse" />
    </div>
  )
}

function SvgLineChart({
  title,
  subtitle,
  data,
  color,
  gradientId,
  formatY,
  emptyMessage,
}: {
  title: string
  subtitle: string
  data: { month: string; value: number }[]
  color: string
  gradientId: string
  formatY: (v: number) => string
  emptyMessage: string
}) {
  const allZero = data.every((m) => m.value === 0)
  const maxValue = Math.max(...data.map((m) => m.value), 1)
  const points = data.map((m, i) => ({
    x: 60 + (i / 5) * 520,
    y: 170 - (m.value / maxValue) * 150,
    value: m.value,
    month: m.month,
  }))

  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`
      const prev = points[i - 1]
      const cpx = (prev.x + p.x) / 2
      return `C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`
    })
    .join(' ')

  const fillPath =
    `M ${points[0].x} 170 ` +
    points
      .map((p, i) => {
        if (i === 0) return `L ${p.x} ${p.y}`
        const prev = points[i - 1]
        const cpx = (prev.x + p.x) / 2
        return `C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`
      })
      .join(' ') +
    ` L ${points[points.length - 1].x} 170 Z`

  const gridLines = [0, 1, 2, 3].map((i) => 20 + (i / 3) * 150)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
      <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
      <p className="text-white/40 text-sm mb-6">{subtitle}</p>
      <svg viewBox="0 0 600 200" width="100%" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((y) => (
          <line key={y} x1="60" y1={y} x2="580" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        ))}
        {gridLines.map((y, i) => {
          const val = maxValue * (1 - i / 3)
          return (
            <text key={`y-${i}`} x="50" y={y + 4} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end">
              {formatY(val)}
            </text>
          )
        })}
        {points.map((p, i) => (
          <text key={`x-${i}`} x={p.x} y="190" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">
            {p.month}
          </text>
        ))}
        {!allZero && (
          <>
            <path d={fillPath} fill={`url(#${gradientId})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            {points.map(
              (p, i) =>
                p.value > 0 && (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                    <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="white" strokeWidth="1.5" />
                    <title>
                      {formatY(p.value)} — {p.month}
                    </title>
                  </g>
                ),
            )}
          </>
        )}
      </svg>
      {allZero && <p className="text-white/30 text-sm text-center mt-2">{emptyMessage}</p>}
    </div>
  )
}

function dealStatusDot(status: string) {
  if (status === 'completed') return 'bg-blue-400'
  if (status === 'replied') return 'bg-green-400'
  return 'bg-orange-400'
}

type CreatorStats = {
  totalRevenue: number
  monthRevenue: number
  completedDeals: number
  inProgressDeals: number
  allDeals: number
  totalSubs: number
  totalViews: number
  channelsCount: number
  avgRating: number
  reviewsCount: number
  chartData: { month: string; value: number }[]
  recentDeals: any[]
}

type AdvertiserStats = {
  totalSpent: number
  monthSpent: number
  activeCampaigns: number
  completedCampaigns: number
  allCampaigns: number
  topCategory: string
  topCreator: string
  avgRating: number
  reviewsCount: number
  chartData: { month: string; value: number }[]
  activeCampaignsList: any[]
}

export default function StatisticsPage() {
  const { role } = useDashboard()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null)
  const [advertiserStats, setAdvertiserStats] = useState<AdvertiserStats | null>(null)

  useEffect(() => {
    const loadStatistics = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      try {
        if (role === 'creator') {
          const { data: myChannels } = await supabase
            .from('channels')
            .select('id, name, subscriber_count, avg_views')
            .eq('owner_id', user.id)

          const channelIds = (myChannels || []).map((c) => c.id)

          const firstDayOfMonth = new Date()
          firstDayOfMonth.setDate(1)
          firstDayOfMonth.setHours(0, 0, 0, 0)

          const [allReqRes, completedReqRes, repliedReqRes, monthReqRes, reviewsRes] =
            await Promise.all([
              channelIds.length > 0
                ? supabase.from('ad_requests').select('id, budget, created_at, status, advertiser_name').in('channel_id', channelIds)
                : Promise.resolve({ data: [] as any[] }),
              channelIds.length > 0
                ? supabase.from('ad_requests').select('id, budget, created_at').in('channel_id', channelIds).eq('status', 'completed')
                : Promise.resolve({ data: [] as any[] }),
              channelIds.length > 0
                ? supabase.from('ad_requests').select('id').in('channel_id', channelIds).eq('status', 'replied')
                : Promise.resolve({ data: [] as any[] }),
              channelIds.length > 0
                ? supabase.from('ad_requests').select('id, budget').in('channel_id', channelIds).eq('status', 'completed').gte('created_at', firstDayOfMonth.toISOString())
                : Promise.resolve({ data: [] as any[] }),
              supabase.from('reviews').select('rating').eq('reviewee_id', user.id),
            ])

          const allDealsRaw = allReqRes.data || []
          const allDealsNonCancelled = allDealsRaw.filter((d) => d.status !== 'cancelled')
          const completedDeals = completedReqRes.data || []
          const repliedDeals = repliedReqRes.data || []
          const monthDeals = monthReqRes.data || []
          const reviews = reviewsRes.data || []

          const totalRevenue = completedDeals.reduce((s, d) => s + (Number(d.budget) || 0), 0)
          const monthRevenue = monthDeals.reduce((s, d) => s + (Number(d.budget) || 0), 0)
          const avgRating = reviews.length > 0
            ? reviews.reduce((s, r) => s + safeNum(r.rating), 0) / reviews.length
            : 0
          const totalSubs = (myChannels || []).reduce((s, c) => s + (c.subscriber_count || 0), 0)
          const totalViews = (myChannels || []).reduce((s, c) => s + (c.avg_views || 0), 0)

          const chartData = buildMonthlyChart(completedDeals, 'budget')

          const recentDeals = [...allDealsNonCancelled]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)

          setCreatorStats({
            totalRevenue,
            monthRevenue,
            completedDeals: completedDeals.length,
            inProgressDeals: repliedDeals.length,
            allDeals: allDealsNonCancelled.length,
            totalSubs,
            totalViews,
            channelsCount: (myChannels || []).length,
            avgRating,
            reviewsCount: reviews.length,
            chartData,
            recentDeals,
          })
        } else {
          const firstDayOfMonth = new Date()
          firstDayOfMonth.setDate(1)
          firstDayOfMonth.setHours(0, 0, 0, 0)

          const [campaignsRes, completedReqRes, monthReqRes, reviewsRes] = await Promise.all([
            supabase.from('campaigns').select('id, name, status, category, budget, created_at').eq('advertiser_id', user.id),
            supabase.from('ad_requests').select('id, budget, created_at, channel_id').eq('advertiser_id', user.id).eq('status', 'completed'),
            supabase.from('ad_requests').select('id, budget').eq('advertiser_id', user.id).eq('status', 'completed').gte('created_at', firstDayOfMonth.toISOString()),
            supabase.from('reviews').select('rating').eq('reviewee_id', user.id),
          ])

          const campaigns = campaignsRes.data || []
          const completedRequests = completedReqRes.data || []
          const monthRequests = monthReqRes.data || []
          const reviews = reviewsRes.data || []

          const totalSpent = completedRequests.reduce((s, r) => s + (Number(r.budget) || 0), 0)
          const monthSpent = monthRequests.reduce((s, r) => s + (Number(r.budget) || 0), 0)

          const activeCampaigns = campaigns.filter((c) => c.status === 'active').length
          const completedCampaigns = campaigns.filter((c) => c.status === 'completed').length

          const avgRating = reviews.length > 0
            ? reviews.reduce((s, r) => s + safeNum(r.rating), 0) / reviews.length
            : 0

          const categoryCounts: Record<string, number> = {}
          campaigns.forEach((c) => {
            if (c.category) categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1
          })
          const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

          const channelIds = [...new Set(completedRequests.map((r) => r.channel_id).filter(Boolean))]
          let channelViews: Record<string, number> = {}
          let topCreator = '—'

          if (channelIds.length > 0) {
            const { data: channelsData } = await supabase
              .from('channels')
              .select('id, avg_views, owner_id')
              .in('id', channelIds)

            ;(channelsData || []).forEach((c) => {
              channelViews[c.id] = c.avg_views || 0
            })

            const channelCounts: Record<string, number> = {}
            completedRequests.forEach((r) => {
              if (r.channel_id) channelCounts[r.channel_id] = (channelCounts[r.channel_id] || 0) + 1
            })
            const topChannelId = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

            if (topChannelId) {
              const ownerId = (channelsData || []).find((c) => c.id === topChannelId)?.owner_id
              if (ownerId) {
                const { data: ownerProfile } = await supabase
                  .from('profiles')
                  .select('full_name, username')
                  .eq('id', ownerId)
                  .single()
                topCreator = ownerProfile?.full_name || ownerProfile?.username || '—'
              }
            }
          }

          const reachData = completedRequests.map((r) => ({
            ...r,
            reach: channelViews[r.channel_id] || 0,
          }))

          const chartData = buildMonthlyChart(reachData, 'reach')

          setAdvertiserStats({
            totalSpent,
            monthSpent,
            activeCampaigns,
            completedCampaigns,
            allCampaigns: campaigns.length,
            topCategory,
            topCreator: topCreator.length > 15 ? `${topCreator.slice(0, 15)}…` : topCreator,
            avgRating,
            reviewsCount: reviews.length,
            chartData,
            activeCampaignsList: campaigns.filter((c) => c.status === 'active'),
          })
        }
      } catch {
        // keep null data, show empty state
      }

      setLoading(false)
    }

    loadStatistics()
  }, [role])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Статистика</h1>
        <p className="text-white/50 mb-8">Загрузка данных...</p>
        <SkeletonCards />
      </div>
    )
  }

  if (role === 'creator' && creatorStats) {
    const d = creatorStats
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Статистика</h1>
        <p className="text-white/50 mb-8">Обзор доходов, сделок и каналов</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <BigMetricCard title="Доход" iconClass="ti-currency-dollar" borderClass="border-green-500/30">
            <SubMetric label="За месяц" value={`${d.monthRevenue.toLocaleString()} AMD`} className="text-green-400" />
            <SubMetric label="За всё время" value={`${d.totalRevenue.toLocaleString()} AMD`} className="text-green-400" />
          </BigMetricCard>

          <BigMetricCard title="Сделки" iconClass="ti-handshake" cols={3}>
            <SubMetric label="Завершённые" value={d.completedDeals} className="text-green-400" />
            <SubMetric label="В процессе" value={d.inProgressDeals} className="text-yellow-400" />
            <SubMetric label="Все" value={d.allDeals} />
          </BigMetricCard>

          <BigMetricCard title="Каналы" iconClass="ti-brand-telegram" cols={3}>
            <SubMetric label="Подписчиков" value={d.totalSubs.toLocaleString()} />
            <SubMetric label="Просмотров" value={`${d.totalViews.toLocaleString()}/пост`} />
            <SubMetric label="Каналов" value={d.channelsCount} />
          </BigMetricCard>

          <BigMetricCard title="Репутация" iconClass="ti-star">
            <SubMetric label="Рейтинг" value={`${d.avgRating.toFixed(1)} ★`} className="text-yellow-400" />
            <SubMetric label="Отзывов" value={d.reviewsCount} />
          </BigMetricCard>
        </div>

        <SvgLineChart
          title="График дохода"
          subtitle="Доход от завершённых сделок по месяцам"
          data={d.chartData}
          color="#9333ea"
          gradientId="lineGrad"
          formatY={(v) => `${Math.round(v).toLocaleString()} AMD`}
          emptyMessage="График появится после первой завершённой сделки"
        />

        <h2 className="text-xl font-bold text-white mb-4">Последние сделки</h2>
        {d.recentDeals.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/50 text-sm">
            Пока нет сделок
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {d.recentDeals.map((deal) => (
              <div key={deal.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-4">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dealStatusDot(deal.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{deal.advertiser_name || '—'}</div>
                  <div className="text-white/40 text-xs">{new Date(deal.created_at).toLocaleDateString('ru-RU')}</div>
                </div>
                <div className="text-purple-400 font-semibold">{formatAmdWithUsd(deal.budget)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (advertiserStats) {
    const d = advertiserStats
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Статистика</h1>
        <p className="text-white/50 mb-8">Обзор расходов, кампаний и репутации</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <BigMetricCard title="Расходы" iconClass="ti-cash" borderClass="border-red-500/30">
            <SubMetric label="За месяц" value={`${d.monthSpent.toLocaleString()} AMD`} className="text-red-400" />
            <SubMetric label="За всё время" value={`${d.totalSpent.toLocaleString()} AMD`} className="text-red-400" />
            <div className="col-span-2 text-white/40 text-xs mt-1">≈ ${Math.round(d.totalSpent / 385)}</div>
          </BigMetricCard>

          <BigMetricCard title="Кампании" iconClass="ti-clipboard-list" cols={3}>
            <SubMetric label="Активные" value={d.activeCampaigns} className="text-green-400" />
            <SubMetric label="Завершённые" value={d.completedCampaigns} className="text-blue-400" />
            <SubMetric label="Все" value={d.allCampaigns} />
          </BigMetricCard>

          <BigMetricCard title="Creators" iconClass="ti-users">
            <SubMetric label="Топ исполнитель" value={d.topCreator} />
            <SubMetric label="Популярная тематика" value={d.topCategory} />
          </BigMetricCard>

          <BigMetricCard title="Репутация" iconClass="ti-star">
            <SubMetric label="Рейтинг" value={`${d.avgRating.toFixed(1)} ★`} className="text-yellow-400" />
            <SubMetric label="Отзывов" value={d.reviewsCount} />
          </BigMetricCard>
        </div>

        <SvgLineChart
          title="Приблизительный охват"
          subtitle="Суммарные просмотры рекламных постов за последние 6 месяцев"
          data={d.chartData}
          color="#0d9488"
          gradientId="lineGradTeal"
          formatY={(v) => `${Math.round(v / 1000)}K`}
          emptyMessage="График появится после первой завершённой сделки"
        />

        <h2 className="text-xl font-bold text-white mb-4">Активные кампании</h2>
        {d.activeCampaignsList.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/50 text-sm">
            Нет активных кампаний
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {d.activeCampaignsList.map((camp) => (
              <div key={camp.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium">{camp.name}</div>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-white/50">
                    <span className="text-purple-400">{safeNum(camp.budget).toLocaleString()} AMD</span>
                    {camp.category && (
                      <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">{camp.category}</span>
                    )}
                    <span>{new Date(camp.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
                <span className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full">Активна</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Статистика</h1>
      <p className="text-white/50">Не удалось загрузить данные</p>
    </div>
  )
}
