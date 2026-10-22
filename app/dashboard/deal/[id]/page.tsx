'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { fetchOwnedOrMarketplaceChannel } from '@/lib/marketplace-public'
import {
  AdvertiserDealActions,
  CreatorDealActions,
  DealTimeline,
} from '../../components/DealManagement'
import MarketplaceOrderDetails from '@/app/dashboard/components/deal/MarketplaceOrderDetails'
import StatusToast from '@/app/dashboard/components/marketplace/StatusToast'
import { glassDealCard, normalizeDealStatus } from '@/lib/deals'
import FinalTermsSection from '@/app/dashboard/components/deal/FinalTermsSection'
import DealContentSection from '@/app/dashboard/components/deal/DealContentSection'
import PlacementsSection from '@/app/dashboard/components/deal/PlacementsSection'
import FinalReviewSection from '@/app/dashboard/components/deal/FinalReviewSection'
import SimulatedDealPaymentSection from '@/app/dashboard/components/deal/SimulatedDealPaymentSection'
import OrderProgress from '@/app/dashboard/components/deal/OrderProgress'
import DealChat from '@/app/dashboard/components/DealChat'
import { markDealViewed } from '@/lib/notifications'
import type { AdRequest, Channel, DealMaterial, DealPlacement } from '@/lib/database.types'
import { coerceAdRequestRow } from '@/lib/final-terms-ui'
import { coerceMaterial } from '@/lib/deal-content-ui'
import {
  coercePlacements,
  parseTelegramAnalyticsMap,
  shouldUsePlacementsWorkflow,
  type PlacementTelegramAnalytics,
} from '@/lib/placements-ui'
import {
  getOrderFlowStatusLabel,
  getOrderNextStepCopy,
  isDealChatAvailable,
  isMarketplaceOrderDeal,
  ORDER_CHAT_LOCKED_COPY,
} from '@/lib/order-flow'

export default function DealDetailPage() {
  const params = useParams()
  const dealId = params.id as string
  const searchParams = useSearchParams()
  const createdToast = searchParams.get('created') === '1'
  const router = useRouter()
  const supabase = createClient()

  const [request, setRequest] = useState<AdRequest | null>(null)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [placements, setPlacements] = useState<DealPlacement[]>([])
  const [material, setMaterial] = useState<DealMaterial | null>(null)
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
    const [{ data: deal }, { data: placementRows }, { data: materialRow }] = await Promise.all([
      supabase.from('ad_requests').select('*').eq('id', dealId).single(),
      supabase
        .from('deal_placements')
        .select('*')
        .eq('ad_request_id', dealId)
        .order('placement_index', { ascending: true }),
      supabase.from('deal_materials').select('*').eq('ad_request_id', dealId).maybeSingle(),
    ])

    if (deal) {
      setRequest(coerceAdRequestRow(deal as Record<string, unknown>))
    }

    const nextPlacements = coercePlacements(placementRows)
    setPlacements(nextPlacements)
    setMaterial(coerceMaterial(materialRow))
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
        router.push('/dashboard/orders')
        return
      }

      const { channel: ch, isOwner } = deal.channel_id
        ? await fetchOwnedOrMarketplaceChannel(supabase, deal.channel_id, user.id)
        : { channel: null, isOwner: false }

      const isCreator = isOwner || ch?.owner_id === user.id
      const isAdvertiser = deal.advertiser_id === user.id
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!isCreator && !isAdvertiser && !profile?.is_admin) {
        router.push('/dashboard/orders')
        return
      }

      setRequest(coerceAdRequestRow(deal as Record<string, unknown>))
      setChannel(ch)
      const userRole = isCreator ? 'creator' : 'advertiser'
      setRole(userRole)
      if (isCreator || isAdvertiser) {
        await markDealViewed(supabase, dealId, userRole)
      }

      const [{ data: placementRows }, { data: materialRow }] = await Promise.all([
        supabase
          .from('deal_placements')
          .select('*')
          .eq('ad_request_id', dealId)
          .order('placement_index', { ascending: true }),
        supabase.from('deal_materials').select('*').eq('ad_request_id', dealId).maybeSingle(),
      ])

      const nextPlacements = coercePlacements(placementRows)
      setPlacements(nextPlacements)
      setMaterial(coerceMaterial(materialRow))
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

  const status = normalizeDealStatus(request.status)
  const marketplace = isMarketplaceOrderDeal(request)
  const usePlacementsWorkflow = !marketplace && shouldUsePlacementsWorkflow(request, placements)
  const chatOpen = isDealChatAvailable(request)
  const statusLabel = getOrderFlowStatusLabel(request, role)
  const nextCopy = getOrderNextStepCopy(request, role)
  const showActionsPanel =
    !usePlacementsWorkflow ||
    status === 'completed' ||
    ['new', 'payment_pending', 'accepted', 'in_progress', 'submitted'].includes(status)

  return (
    <div>
      <Link
        href="/dashboard/orders"
        className="text-white/50 hover:text-white transition text-sm mb-6 inline-flex items-center gap-2"
      >
        ← Назад к заказам
      </Link>

      <div className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Заказ #{request.id.slice(0, 8)}</h1>
            <p className="text-white font-medium m-0">{channel?.name || 'Канал'}</p>
            {channel?.telegram_username ? (
              <p className="text-white/40 text-sm m-0">@{channel.telegram_username}</p>
            ) : null}
          </div>
          <span className="text-sm text-white/80 bg-white/10 rounded-full px-3 py-1">{statusLabel}</span>
        </div>
        <OrderProgress deal={request} />
        {nextCopy ? <p className="text-white/55 text-sm mt-1 mb-0">{nextCopy}</p> : null}
      </div>

      {createdToast ? <StatusToast message="Заказ отправлен" /> : null}

      {showActionsPanel && (
        <div style={{ ...glassDealCard, padding: '20px', marginBottom: '16px' }}>
          {role === 'creator' ? (
            <CreatorDealActions
              request={request}
              channel={channel}
              userId={userId}
              onUpdate={handleUpdate}
              onRefresh={refreshDealState}
              showDetails={false}
              hideLegacyProofSubmit={usePlacementsWorkflow}
              useNewLifecycleWorkflow={usePlacementsWorkflow}
            />
          ) : (
            <AdvertiserDealActions
              request={request}
              channel={channel}
              userId={userId}
              onUpdate={handleUpdate}
              showDetails={false}
              useNewLifecycleWorkflow={usePlacementsWorkflow}
            />
          )}
        </div>
      )}

      <SimulatedDealPaymentSection
        dealId={dealId}
        request={request}
        placements={placements}
        role={role}
        onDealUpdate={handleUpdate}
        onRefresh={refreshDealState}
      />

      <MarketplaceOrderDetails request={request} channelName={channel?.name} />

      {!marketplace && (
        <div style={{ ...glassDealCard, padding: '20px', marginBottom: '16px' }}>
          <h2 className="text-white font-semibold mb-3">Детали заказа</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-white/50">Рекламодатель</div>
              <div className="text-white">{request.advertiser_name}</div>
            </div>
            <div>
              <div className="text-white/50">Создан</div>
              <div className="text-white">{new Date(request.created_at).toLocaleString('ru-RU')}</div>
            </div>
          </div>
          {request.message ? (
            <p className="text-white/80 text-sm mt-3 mb-0 whitespace-pre-wrap">{request.message}</p>
          ) : null}
        </div>
      )}

      {!marketplace && (
        <>
          <FinalTermsSection
            dealId={dealId}
            request={request}
            currentUserId={userId}
            onUpdate={handleUpdate}
            onRefresh={refreshDealState}
          />

          <DealContentSection
            dealId={dealId}
            request={request}
            material={material}
            placements={placements}
            role={role}
            onDealUpdate={handleUpdate}
            onMaterialUpdate={setMaterial}
            onPlacementsUpdate={setPlacements}
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

          <FinalReviewSection
            dealId={dealId}
            request={request}
            placements={placements}
            role={role}
            onDealUpdate={handleUpdate}
            onPlacementsUpdate={setPlacements}
            onRefresh={refreshDealState}
          />
        </>
      )}

      <div style={{ ...glassDealCard, padding: '20px', marginBottom: '16px' }}>
        <h2 className="text-white font-semibold mb-3">Чат</h2>
        {chatOpen && userId ? (
          <DealChat dealId={request.id} currentUserId={userId} />
        ) : (
          <p className="text-white/55 text-sm m-0">{ORDER_CHAT_LOCKED_COPY}</p>
        )}
      </div>

      <div style={{ ...glassDealCard, padding: '20px', marginBottom: '16px' }}>
        <h2 className="text-white font-semibold mb-4">История выполнения</h2>
        <DealTimeline request={request} />
      </div>
    </div>
  )
}
