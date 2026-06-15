'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useDashboard } from './layout'
import { canLeaveReview, canMarkCompleted, canMarkReplied, getOrderStatusBadge } from '@/lib/deals'
import { formatAmdWithUsd } from '@/lib/currency'

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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showReviewFor, setShowReviewFor] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
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

    const replied = requests.filter((r) => r.status === 'replied')
    const completed = requests.filter((r) => r.status === 'completed')
    const postsThisMonth = completed.filter(
      (r) => new Date(r.updated_at || r.created_at) >= monthStart,
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

  const handleMarkReplied = async (requestId: string) => {
    const { error } = await supabase
      .from('ad_requests')
      .update({ status: 'replied' })
      .eq('id', requestId)

    if (!error) {
      setAdRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'replied' } : r)),
      )
    }
  }

  const handleMarkCompleted = async (requestId: string) => {
    const { error } = await supabase
      .from('ad_requests')
      .update({ status: 'completed' })
      .eq('id', requestId)

    if (!error) {
      setAdRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'completed' } : r)),
      )
    }
  }

  const handleSubmitReview = async (requestId: string) => {
    if (!userId) return

    const request = adRequests.find((r) => r.id === requestId)
    if (!request) return

    const revieweeId = request.advertiser_id || null
    if (!revieweeId) {
      setReviewError('Нельзя оставить отзыв: не указан рекламодатель')
      return
    }

    setReviewError('')

    const { error } = await supabase.from('reviews').insert({
      reviewer_id: userId,
      reviewee_id: revieweeId,
      rating: reviewRating,
      comment: reviewComment.trim(),
      deal_id: requestId,
    })

    if (error) {
      setReviewError('Ошибка: ' + error.message)
      return
    }

    setReviewSubmitted(requestId)
    setShowReviewFor(null)
    setReviewComment('')
    setReviewRating(5)
  }

  const metricCards = [
    { label: 'Завершено в этом месяце', value: metrics.postsThisMonth.toLocaleString() },
    { label: 'Всего подписчиков', value: metrics.totalSubscribers.toLocaleString() },
    { label: 'Завершённых сделок', value: metrics.adPosts.toLocaleString() },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">Мои каналы</h1>
        <Link
          href="/dashboard/add-channel"
          className="btn-accent transition text-white px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2"
        >
          <i className="ti ti-plus" style={{ fontSize: '14px' }} />
          Добавить канал
        </Link>
      </div>
      <p className="text-white/50 mb-8">Управляй своими Telegram каналами</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
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
            className="bg-purple-600 hover:bg-purple-500 transition text-white px-6 py-2.5 rounded-full text-sm font-medium"
          >
            Добавить канал
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/dashboard/edit-channel/${channel.id}`}
              className="flex items-center gap-6 hover:border-purple-500/50 transition cursor-pointer"
              style={glassCardStyle}
            >
              {channel.avatar_url ? (
                <img
                  src={channel.avatar_url}
                  alt={channel.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {channel.name[0]}
                </div>
              )}
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
                  <div className="text-purple-400 font-semibold">{formatAmdWithUsd(channel.ad_price)}</div>
                  <div className="text-white/40 text-xs">цена</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-full text-xs ${
                  channel.verification_status === 'verified'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {channel.verification_status === 'verified' ? '✓ Верифицирован' : '⏳ На проверке'}
                </div>
                <span className="text-white/30 text-sm">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-bold text-white mb-4">История заказов</h2>
        {adRequests.length === 0 ? (
          <div className="text-center text-white/50" style={glassCardStyle}>
            Пока нет заказов
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {adRequests.map((request) => {
              const badge = getOrderStatusBadge(request.status)
              const isExpanded = expandedId === request.id
              const channel = channelMap[request.channel_id]

              return (
                <div key={request.id} className="overflow-hidden" style={glassCardStyle}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                    className="w-full p-6 flex items-start justify-between gap-4 text-left hover:bg-white/5 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <div className="text-white font-semibold">{request.advertiser_name}</div>
                        <span className={`px-3 py-1 rounded-full text-xs ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-white/40 text-sm">{request.advertiser_contact}</div>
                      <div className="text-purple-400 font-semibold mt-2">
                        {formatAmdWithUsd(request.budget)}
                      </div>
                      <p className="text-white/70 text-sm mt-2 line-clamp-2">{request.message}</p>
                      <div className="text-white/40 text-xs mt-2">
                        {new Date(request.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    <span className="text-white/40 text-lg flex-shrink-0">→</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/10 p-6">
                      <div className="space-y-3 text-sm mb-6">
                        <div>
                          <div className="text-white/50 mb-1">Сообщение</div>
                          <p className="text-white/80">{request.message}</p>
                        </div>
                        <div>
                          <div className="text-white/50 mb-1">Контакт</div>
                          <p className="text-white/80">{request.advertiser_contact}</p>
                        </div>
                        <div>
                          <div className="text-white/50 mb-1">Канал</div>
                          <p className="text-white/80">
                            {channel ? `${channel.name} (@${channel.telegram_username})` : '—'}
                          </p>
                        </div>
                        <div>
                          <div className="text-white/50 mb-1">Дата и время</div>
                          <p className="text-white/80">
                            {new Date(request.created_at).toLocaleString('ru-RU')}
                          </p>
                        </div>
                        <div>
                          <div className="text-white/50 mb-1">Статус</div>
                          <span className={`px-3 py-1 rounded-full text-xs inline-block ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {canMarkReplied(request.status) && (
                          <button
                            type="button"
                            onClick={() => handleMarkReplied(request.id)}
                            className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-2 text-sm transition"
                          >
                            Отметить как отвечено
                          </button>
                        )}
                        {canMarkCompleted(request.status) && (
                          <button
                            type="button"
                            onClick={() => handleMarkCompleted(request.id)}
                            className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-2 text-sm transition"
                          >
                            Завершить заказ
                          </button>
                        )}
                        {reviewSubmitted === request.id ? (
                          <span className="text-green-400 text-sm flex items-center">✓ Отзыв отправлен</span>
                        ) : showReviewFor === request.id ? (
                          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                            <div className="text-white text-sm font-medium mb-3">Оставить отзыв</div>
                            <div className="flex gap-1 mb-3">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setReviewRating(star)}
                                  className={`text-xl transition ${star <= reviewRating ? 'text-yellow-400' : 'text-white/20'}`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder="Комментарий..."
                              rows={3}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm resize-none mb-3"
                            />
                            {reviewError && (
                              <p className="text-red-400 text-sm mb-3">{reviewError}</p>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSubmitReview(request.id)}
                                className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-2 text-sm"
                              >
                                Отправить
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReviewFor(null)
                                  setReviewError('')
                                }}
                                className="border border-white/20 text-white/60 rounded-full px-4 py-2 text-sm"
                              >
                                Отмена
                              </button>
                            </div>
                          </div>
                        ) : canLeaveReview(request.status) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowReviewFor(request.id)
                              setReviewRating(5)
                              setReviewComment('')
                              setReviewError('')
                            }}
                            className="border border-white/20 text-white/80 hover:text-white rounded-full px-4 py-2 text-sm transition"
                          >
                            Оставить отзыв
                          </button>
                        ) : null}
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

function AdvertiserDashboard() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({})
  const [metrics, setMetrics] = useState({ activeCampaigns: 0, completedDeals: 0, spent: 0 })
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  const loadCampaigns = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('advertiser_id', user.id)
      .order('created_at', { ascending: false })

    const campaignList = campaignData || []
    setCampaigns(campaignList)

    const { data: completedRequests } = await supabase
      .from('ad_requests')
      .select('budget')
      .eq('advertiser_id', user.id)
      .eq('status', 'completed')

    const activeCampaigns = campaignList.filter((c) => c.status === 'active').length
    const completedDeals = campaignList.filter((c) => c.status === 'completed').length
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

  const getCampaignStatus = (status: string) => {
    if (status === 'active') return { label: 'Активна', className: 'bg-green-500/20 text-green-400' }
    if (status === 'completed') return { label: 'Завершена', className: 'bg-blue-500/20 text-blue-400' }
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

      <div className="grid grid-cols-3 gap-4 mb-8">
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
          className="bg-purple-600 hover:bg-purple-500 transition text-white px-6 py-2.5 rounded-full text-sm font-medium"
        >
          + Создать кампанию
        </button>
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
                  className={`overflow-hidden transition ${
                    isExpanded ? 'border-purple-500/30' : ''
                  }`}
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
                          <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">
                            {campaign.category}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-white/50">
                        <span className="text-purple-400">
                          {Number(campaign.budget).toLocaleString()} AMD
                        </span>
                        <span>{new Date(campaign.created_at).toLocaleDateString('ru-RU')}</span>
                        <span>{responses} откликов</span>
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
                          <p className="text-white/80">
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
                        {campaign.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleCompleteCampaign(campaign.id)}
                            className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-4 py-2 text-sm transition"
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
