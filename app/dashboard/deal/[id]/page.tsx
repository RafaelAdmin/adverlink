'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  AdvertiserDealActions,
  CreatorDealActions,
  DealStatusPill,
  DealTimeline,
} from '../../components/DealManagement'
import { formatAmdWithUsd } from '@/lib/currency'
import { glassDealCard } from '@/lib/deals'
import FinalTermsSection from '@/app/dashboard/components/deal/FinalTermsSection'
import PlacementsSection from '@/app/dashboard/components/deal/PlacementsSection'
import DealChat from '@/app/dashboard/components/DealChat'
import { markDealViewed } from '@/lib/notifications'
import type { AdRequest, Channel, DealPlacement } from '@/lib/database.types'
import { coerceAdRequestRow } from '@/lib/final-terms-ui'
import {
  coercePlacements,
  parseTelegramAnalyticsMap,
  shouldUsePlacementsWorkflow,
  type PlacementTelegramAnalytics,
} from '@/lib/placements-ui'

export default function DealDetailPage() {
  const params = useParams()
  const dealId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [request, setRequest] = useState<AdRequest | null>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [placements, setPlacements] = useState<DealPlacement[]>([])
  const [telegramAnalytics, setTelegramAnalytics] = useState<
    Record<string, PlacementTelegramAnalytics>
  >({})
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<'creator' | 'advertiser' | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTelegramAnalytics = useCallback(
    async (rows: DealPlacement[]) => {
      const postIds = rows
        .map((p) => p.telegram_post_id)
        .filter((id): id is string => Boolean(id))

      if (postIds.length === 0) {
        setTelegramAnalytics({})
        return
      }

      const [{ data: posts }, { data: snapshots }] = await Promise.all([
        supabase.from('telegram_posts').select('id, current_views').in('id', postIds),
        supabase
          .from('telegram_post_snapshots')
          .select('post_id, views, captured_at')
          .in('post_id', postIds)
          .eq('checkpoint', '24h'),
      ])

      setTelegramAnalytics(parseTelegramAnalyticsMap(posts, snapshots))
    },
    [supabase],
  )

  const refreshDealState = useCallback(async () => {
    const [{ data: deal }, { data: placementRows }] = await Promise.all([
      supabase.from('ad_requests').select('*').eq('id', dealId).single(),
      supabase
        .from('deal_placements')
        .select('*')
        .eq('ad_request_id', dealId)
        .order('placement_index', { ascending: true }),
    ])

    if (deal) {
      setRequest(coerceAdRequestRow(deal as Record<string, unknown>))
    }

    const nextPlacements = coercePlacements(placementRows)
    setPlacements(nextPlacements)
    await loadTelegramAnalytics(nextPlacements)
  }, [dealId, loadTelegramAnalytics, supabase])

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUserId(user.id)

      const { data: deal, error } = await supabase
        .from('ad_requests')
        .select('*')
        .eq('id', dealId)
        .single()

      if (error || !deal) {
        router.push('/dashboard')
        return
      }

      const { data: ch } = await supabase
        .from('channels')
        .select('*')
        .eq('id', deal.channel_id)
        .single()

      const isCreator = ch?.owner_id === user.id
      const isAdvertiser = deal.advertiser_id === user.id

      if (!isCreator && !isAdvertiser) {
        router.push('/dashboard')
        return
      }

      setRequest(coerceAdRequestRow(deal as Record<string, unknown>))
      setChannel(ch)
      const userRole = isCreator ? 'creator' : 'advertiser'
      setRole(userRole)
      await markDealViewed(supabase, dealId, userRole)

      const { data: placementRows } = await supabase
        .from('deal_placements')
        .select('*')
        .eq('ad_request_id', dealId)
        .order('placement_index', { ascending: true })

      const nextPlacements = coercePlacements(placementRows)
      setPlacements(nextPlacements)
      await loadTelegramAnalytics(nextPlacements)
      setLoading(false)
    }
    load()
  }, [dealId, loadTelegramAnalytics, router, supabase])

  const handleUpdate = (patch: Partial<AdRequest>) => {
    setRequest((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  if (loading || !request || !role) {
    return <div className="text-white/50">Загрузка...</div>
  }

  const status = request.status
  const usePlacementsWorkflow = shouldUsePlacementsWorkflow(request, placements)

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="text-white/50 hover:text-white transition text-sm mb-6 inline-flex items-center gap-2"
      >
        ← Назад
      </Link>

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-2xl font-bold text-white">Заказ #{request.id.slice(0, 8)}</h1>
        <DealStatusPill status={status} large />
      </div>

      <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
        <h2 className="text-white font-semibold mb-4">Информация о заказе</h2>
        <div className="flex items-center gap-4 mb-4">
          {channel?.avatar_url ? (
            <img src={channel.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full avatar-accent-fallback flex items-center justify-center text-white font-bold">
              {channel?.name?.[0] || '?'}
            </div>
          )}
          <div>
            <div className="text-white font-medium">{channel?.name || '—'}</div>
            <div className="text-white/40 text-sm">@{channel?.telegram_username}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-white/50">Рекламодатель</div>
            <div className="text-white">{request.advertiser_name}</div>
            <div className="text-white/60">{request.advertiser_contact}</div>
          </div>
          <div>
            <div className="text-white/50">Бюджет</div>
            <div className="text-price-accent">{formatAmdWithUsd(request.budget)}</div>
          </div>
          <div>
            <div className="text-white/50">Постов</div>
            <div className="text-white">{request.posts_count || 1}</div>
          </div>
          <div>
            <div className="text-white/50">Создан</div>
            <div className="text-white">{new Date(request.created_at).toLocaleString('ru-RU')}</div>
          </div>
          {request.accepted_at && (
            <div>
              <div className="text-white/50">Принят</div>
              <div className="text-white">{new Date(request.accepted_at).toLocaleString('ru-RU')}</div>
            </div>
          )}
          {request.completed_at && (
            <div>
              <div className="text-white/50">Завершён</div>
              <div className="text-white">{new Date(request.completed_at).toLocaleString('ru-RU')}</div>
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="text-white/50 text-sm mb-1">Сообщение</div>
          <p className="text-white/80 text-sm">{request.message}</p>
        </div>
      </div>

      <FinalTermsSection
        dealId={dealId}
        request={request}
        currentUserId={userId}
        onUpdate={handleUpdate}
        onRefresh={refreshDealState}
      />

      <PlacementsSection
        dealId={dealId}
        request={request}
        placements={placements}
        role={role}
        channel={channel}
        telegramAnalytics={telegramAnalytics}
        onDealUpdate={handleUpdate}
        onPlacementsUpdate={setPlacements}
        onRefresh={refreshDealState}
      />

      <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
        <h2 className="text-white font-semibold mb-4">История</h2>
        <DealTimeline request={request} />
      </div>

      {!usePlacementsWorkflow &&
        (status === 'submitted' || status === 'completed') &&
        request.proof_links &&
        request.proof_links.length > 0 && (
        <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
          <h2 className="text-white font-semibold mb-4">Доказательства выполнения</h2>
          {request.proof_links.map((link, i) => (
            <a
              key={i}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#60a5fa',
                textDecoration: 'none',
                marginBottom: '8px',
              }}
            >
              <i className="ti ti-brand-telegram" />
              Пост в Telegram
              <i className="ti ti-external-link" style={{ marginLeft: 'auto' }} />
            </a>
          ))}
        </div>
      )}

      <div style={{ ...glassDealCard, padding: '24px' }}>
        <h2 className="text-white font-semibold mb-4">Действия</h2>
        {role === 'creator' ? (
          <CreatorDealActions
            request={request}
            channel={channel}
            userId={userId}
            onUpdate={handleUpdate}
            showDetails={false}
            hideLegacyProofSubmit={usePlacementsWorkflow}
          />
        ) : (
          <AdvertiserDealActions
            request={request}
            channel={channel}
            userId={userId}
            onUpdate={handleUpdate}
            showDetails={false}
          />
        )}
      </div>

      {userId && request && (
        <div style={{ marginTop: '24px' }}>
          <DealChat dealId={request.id} currentUserId={userId} />
        </div>
      )}
    </div>
  )
}
