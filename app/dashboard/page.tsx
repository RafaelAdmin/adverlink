'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useDashboard } from './layout'
import { CreatorDealCard, AdvertiserDealCard } from './components/DealManagement'

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  padding: '24px',
}

export default function DashboardPage() {
  const { role } = useDashboard()
  return role === 'creator' ? <CreatorDashboard /> : <AdvertiserDashboard />
}

function CreatorDashboard() {
  const [channels, setChannels] = useState<any[]>([])
  const [adRequests, setAdRequests] = useState<any[]>([])
  const [metrics, setMetrics] = useState({ postsThisMonth: 0, totalSubscribers: 0, adPosts: 0 })
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const supabase = createClient()

  const channelMap = Object.fromEntries(channels.map((c) => [c.id, c]))

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('owner_id', user.id)
    const channelData = data || []
    setChannels(channelData)

    const totalSubscribers = channelData.reduce((sum, c) => sum + (c.subscriber_count ?? 0), 0)
    const channelIds = channelData.map((c) => c.id)

    let requests: any[] = []
    if (channelIds.length > 0) {
      const { data: reqs, error } = await supabase
        .from('ad_requests')
        .select('*')
        .in('channel_id', channelIds)
        .order('created_at', { ascending: false })
      requests = reqs || []
    }
    setAdRequests(requests)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const completed = requests.filter((r) => r.status === 'completed')
    const postsThisMonth = completed.filter(
      (r) => new Date(r.completed_at || r.updated_at || r.created_at) >= monthStart,
    ).length

    setMetrics({
      postsThisMonth,
      totalSubscribers,
      adPosts: completed.length,
    })
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDealUpdate = (id: string, patch: Record<string, unknown>) => {
    setAdRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    if (patch.status === 'completed') {
      setMetrics((m) => ({ ...m, adPosts: m.adPosts + 1 }))
    }
  }

  const metricCards = [
    { label: 'Завершено в этом месяце', value: metrics.postsThisMonth.toLocaleString() },
    { label: 'Всего подписчиков', value: metrics.totalSubscribers.toLocaleString() },
    { label: 'Завершённых сделок', value: metrics.adPosts.toLocaleString() },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
        <h1 className="text-2xl font-bold text-white">Мои каналы</h1>
        <Link
          href="/dashboard/add-channel"
          className="btn-accent transition text-white px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 self-start sm:self-auto"
        >
          <i className="ti ti-plus" style={{ fontSize: '14px' }} />
          Добавить канал
        </Link>
      </div>
      <p className="text-white/50 mb-8">Управляй своими Telegram каналами</p>

      <div
        className="stats-grid mb-8"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}
      >
        {metricCards.map((item) => (
          <div key={item.label} style={glassCardStyle}>
            <div className="text-3xl font-bold text-white mb-1">{item.value}</div>
            <div className="text-white/50 text-sm">{item.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-white/50 text-center py-12">Загрузка...</div>
      ) : channels.length === 0 ? (
        <div className="text-center" style={glassCardStyle}>
          <i className="ti ti-brand-telegram" style={{ fontSize: '32px', color: 'rgba(255,255,255,0.3)' }} />
          <div className="text-white font-medium mb-2 mt-4">У тебя пока нет каналов</div>
          <div className="text-white/40 text-sm mb-6">Добавь свой первый Telegram канал</div>
          <Link
            href="/dashboard/add-channel"
            className="btn-accent transition text-white px-6 py-2.5 rounded-full text-sm font-medium"
          >
            Добавить канал
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/dashboard/edit-channel/${channel.id}`}
              className="channel-row"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                marginBottom: '8px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
            >
              {channel.avatar_url ? (
                <img
                  src={channel.avatar_url}
                  alt={channel.name}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary, #9333ea)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}
                >
                  {channel.name[0]}
                </div>
              )}

              <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {channel.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '20px',
                      background: channel.platform === 'youtube' ? 'rgba(255,0,0,0.15)' : 'rgba(37,99,235,0.15)',
                      color: channel.platform === 'youtube' ? '#ff6b6b' : '#60a5fa',
                      border: channel.platform === 'youtube' ? '1px solid rgba(255,0,0,0.2)' : '1px solid rgba(37,99,235,0.2)',
                      flexShrink: 0,
                    }}
                  >
                    {channel.platform === 'youtube' ? 'YouTube' : 'Telegram'}
                  </span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                  @
                  {channel.telegram_username?.length > 20
                    ? channel.telegram_username.substring(0, 20) + '...'
                    : channel.telegram_username}
                </span>
              </div>

              <div
                className="channel-row-stats"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginTop: '8px',
                  flex: '1 1 100%',
                }}
              >
                <div className="channel-stat-col" style={{ minWidth: '70px', textAlign: 'center' }}>
                  <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                    {channel.subscriber_count >= 1000
                      ? `${(channel.subscriber_count / 1000).toFixed(1)}K`
                      : channel.subscriber_count || 0}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>подписчиков</div>
                </div>

                <div className="channel-stat-col" style={{ minWidth: '70px', textAlign: 'center' }}>
                  <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                    {channel.avg_views >= 1000
                      ? `${(channel.avg_views / 1000).toFixed(1)}K`
                      : channel.avg_views || 0}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>охваты</div>
                </div>

                <div className="channel-stat-col" style={{ minWidth: '90px', textAlign: 'center' }}>
                  <div
                    style={{
                      color: 'var(--accent-primary, #9333ea)',
                      fontSize: '13px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {channel.ad_price
                      ? `${channel.ad_price.toLocaleString()} ${channel.ad_price_currency || 'USD'}`
                      : '—'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>цена</div>
                </div>

                <div className="channel-stat-col" style={{ minWidth: '100px', display: 'flex', justifyContent: 'center' }}>
                  {channel.is_verified ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: '20px',
                        padding: '3px 10px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="11" fill="#22c55e" />
                        <path
                          d="M7.5 12.5L10.5 15.5L16.5 9"
                          stroke="white"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: '600' }}>Верифицирован</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(234,179,8,0.15)',
                        border: '1px solid rgba(234,179,8,0.3)',
                        borderRadius: '20px',
                        padding: '3px 10px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: '600' }}>На проверке</span>
                    </div>
                  )}
                </div>

                <i
                  className="ti ti-chevron-right"
                  style={{ fontSize: '16px', color: 'rgba(255,255,255,0.2)', width: '20px', marginLeft: 'auto' }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-bold text-white mb-4">Управление заказами</h2>
        {adRequests.length === 0 ? (
          <div className="text-center text-white/50" style={glassCardStyle}>
            Пока нет заказов
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {adRequests.map((request) => (
              <CreatorDealCard
                key={request.id}
                request={request}
                channelMap={channelMap}
                userId={userId}
                onUpdate={handleDealUpdate}
                linkToDeal
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AdvertiserDashboard() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [adOrders, setAdOrders] = useState<any[]>([])
  const [orderChannelMap, setOrderChannelMap] = useState<Record<string, any>>({})
  const [userId, setUserId] = useState('')
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({})
  const [metrics, setMetrics] = useState({ activeCampaigns: 0, completedDeals: 0, spent: 0 })
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  const loadCampaigns = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('advertiser_id', user.id)
      .order('created_at', { ascending: false })

    const campaignList = campaignData || []
    setCampaigns(campaignList)

    const { data: orders } = await supabase
      .from('ad_requests')
      .select('*')
      .eq('advertiser_id', user.id)
      .order('created_at', { ascending: false })

    const orderList = orders || []
    setAdOrders(orderList)

    const channelIds = [...new Set(orderList.map((o) => o.channel_id).filter(Boolean))]
    if (channelIds.length > 0) {
      const { data: chData } = await supabase.from('channels').select('*').in('id', channelIds)
      const map: Record<string, any> = {}
      ;(chData || []).forEach((c) => {
        map[c.id] = c
      })
      setOrderChannelMap(map)
    }

    const { data: completedRequests } = await supabase
      .from('ad_requests')
      .select('budget')
      .eq('advertiser_id', user.id)
      .eq('status', 'completed')

    const activeCampaigns = campaignList.filter((c) =>
      ['active', 'collecting', 'in_progress'].includes(c.status),
    ).length
    const completedDeals = orderList.filter((o) => o.status === 'completed').length
    const spent = (completedRequests || []).reduce((sum, r) => sum + (Number(r.budget) || 0), 0)

    setMetrics({ activeCampaigns, completedDeals, spent })

    const counts: Record<string, number> = {}
    for (const campaign of campaignList) {
      const { count: byId } = await supabase
        .from('ad_requests')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)

      if (byId && byId > 0) {
        counts[campaign.id] = byId
      } else {
        const { data: byName } = await supabase
          .from('ad_requests')
          .select('id')
          .eq('advertiser_name', campaign.name)
        counts[campaign.id] = byName?.length || 0
      }
    }
    setResponseCounts(counts)
    setLoading(false)
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  const handleCompleteCampaign = async (campaignId: string) => {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('id', campaignId)

    if (!error) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, status: 'completed' } : c))
      )
      setMetrics((prev) => ({
        ...prev,
        activeCampaigns: Math.max(0, prev.activeCampaigns - 1),
        completedDeals: prev.completedDeals + 1,
      }))
    }
  }

  const handleOrderUpdate = (id: string, patch: Record<string, unknown>) => {
    setAdOrders((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    if (patch.status === 'completed') {
      setMetrics((m) => ({ ...m, completedDeals: m.completedDeals + 1 }))
    }
  }

  const getCampaignStatus = (status: string) => {
    if (status === 'active' || status === 'collecting') {
      return { label: 'Сбор заявок', className: 'bg-green-500/20 text-green-400' }
    }
    if (status === 'in_progress') {
      return { label: 'В работе', className: 'bg-blue-500/20 text-blue-400' }
    }
    if (status === 'completed') return { label: 'Завершена', className: 'bg-blue-500/20 text-blue-400' }
    if (status === 'cancelled') return { label: 'Отменена', className: 'bg-red-500/20 text-red-400' }
    return { label: 'На модерации', className: 'bg-yellow-500/20 text-yellow-400' }
  }

  const metricCards = [
    { label: 'Активных кампаний', value: metrics.activeCampaigns.toLocaleString() },
    { label: 'Завершённых сделок', value: metrics.completedDeals.toLocaleString() },
    { label: 'Потрачено', value: `${metrics.spent.toLocaleString()} AMD` },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Мои кампании</h1>
      <p className="text-white/50 mb-8">Создавай кампании — создатели каналов откликнутся сами</p>

      <div
        className="stats-grid mb-8"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}
      >
        {metricCards.map((item) => (
          <div key={item.label} style={glassCardStyle}>
            <div className="text-3xl font-bold text-white mb-1">{item.value}</div>
            <div className="text-white/50 text-sm">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="text-center mb-10" style={glassCardStyle}>
        <i className="ti ti-speakerphone" style={{ fontSize: '32px', color: 'rgba(255,255,255,0.3)' }} />
        <div className="text-white font-medium mb-2 mt-4">
          {campaigns.length === 0 ? 'У тебя пока нет кампаний' : 'Запусти новую кампанию'}
        </div>
        <div className="text-white/40 text-sm mb-6">
          Опиши рекламу — создатели увидят кампанию в маркетплейсе и отправят отклики
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/create-campaign')}
          className="btn-accent transition text-white px-6 py-2.5 rounded-full text-sm font-medium"
        >
          + Создать кампанию
        </button>
      </div>

      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4">Мои заказы</h2>
        {adOrders.length === 0 ? (
          <div className="text-center text-white/50" style={glassCardStyle}>
            Заказов пока нет. Отправьте запрос на рекламу в маркетплейсе.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {adOrders.map((order) => (
              <AdvertiserDealCard
                key={order.id}
                request={order}
                channelMap={orderChannelMap}
                userId={userId}
                onUpdate={handleOrderUpdate}
                linkToDeal
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">История кампаний</h2>
        {loading ? (
          <div className="text-white/50 text-center py-8">Загрузка...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center text-white/50" style={glassCardStyle}>
            Кампаний пока нет
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {campaigns.map((campaign) => {
              const isExpanded = expandedId === campaign.id
              const status = getCampaignStatus(campaign.status)
              const responses = responseCounts[campaign.id] || 0

              return (
                <div
                  key={campaign.id}
                  className={`overflow-hidden transition ${isExpanded ? 'border-accent-expanded shadow-accent-expanded' : ''}`}
                  style={{
                    ...glassCardStyle,
                    background: isExpanded ? 'rgba(255,255,255,0.08)' : glassCardStyle.background,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                    className="w-full p-6 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <div className="text-white font-semibold">{campaign.name}</div>
                        {campaign.category && (
                          <span className="badge-accent text-xs px-2 py-0.5 rounded-full">
                            {campaign.category}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-white/50">
                        <span className="text-price-accent">
                          {Number(campaign.budget).toLocaleString()} AMD
                        </span>
                        <span>{new Date(campaign.created_at).toLocaleDateString('ru-RU')}</span>
                        <span>{responses} откликов</span>
                        {(campaign.slots_total ?? 1) > 0 && (
                          <span>
                            {campaign.slots_filled ?? 0}/{campaign.slots_total ?? 1} каналов
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-white/40 text-lg">→</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/10 p-6">
                      <div className="space-y-3 text-sm mb-6">
                        {campaign.description && (
                          <div>
                            <div className="text-white/50 mb-1">Описание</div>
                            <p className="text-white/80">{campaign.description}</p>
                          </div>
                        )}
                        <div>
                          <div className="text-white/50 mb-1">Бюджет</div>
                          <p className="text-price-accent">
                            {Number(campaign.budget).toLocaleString()} AMD
                            {campaign.budget ? ` (≈ $${Math.round(Number(campaign.budget) / 385)})` : ''}
                          </p>
                        </div>
                        {campaign.target_audience && (
                          <div>
                            <div className="text-white/50 mb-1">Целевая аудитория</div>
                            <p className="text-white/80">{campaign.target_audience}</p>
                          </div>
                        )}
                        {campaign.product_link && (
                          <div>
                            <div className="text-white/50 mb-1">Ссылка</div>
                            <p className="text-white/80 break-all">{campaign.product_link}</p>
                          </div>
                        )}
                        {campaign.min_subscribers > 0 && (
                          <div>
                            <div className="text-white/50 mb-1">Мин. подписчиков</div>
                            <p className="text-white/80">{campaign.min_subscribers.toLocaleString()}</p>
                          </div>
                        )}
                        {campaign.preferred_date && (
                          <div>
                            <div className="text-white/50 mb-1">Желаемая дата</div>
                            <p className="text-white/80">
                              {new Date(campaign.preferred_date).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        )}
                        {campaign.requirements && (
                          <div>
                            <div className="text-white/50 mb-1">Особые требования</div>
                            <p className="text-white/80">{campaign.requirements}</p>
                          </div>
                        )}
                        <div>
                          <div className="text-white/50 mb-1">Откликов от создателей</div>
                          <p className="text-white/80">{responses}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {(campaign.status === 'active' || campaign.status === 'collecting' || campaign.status === 'in_progress') && (
                          <button
                            type="button"
                            onClick={() => handleCompleteCampaign(campaign.id)}
                            className="btn-accent text-white rounded-full px-4 py-2 text-sm transition"
                          >
                            Завершить кампанию
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/create-campaign?edit=${campaign.id}`)}
                          className="border border-white/20 text-white/80 hover:text-white rounded-full px-4 py-2 text-sm transition"
                        >
                          Редактировать
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
