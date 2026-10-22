'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DealStatusPill } from '@/app/dashboard/components/DealManagement'
import Button from '@/components/ui/Button'
import { postDealTransition } from '@/lib/deal-api-client'
import {
  formatOrderAmountLabel,
  formatOrderServicesLabel,
  formatPreferredDatesLabel,
  orderRejectionReason,
  type OrderListRecord,
  type OrderSpace,
} from '@/lib/my-orders'
import { markDealViewed } from '@/lib/notifications'
import { getOrderFlowStatusLabel } from '@/lib/order-flow'
import { createClient } from '@/lib/supabase'

export default function MyOrderCard({
  space,
  order,
  channelName,
  userId,
  onUpdate,
}: {
  space: OrderSpace
  order: OrderListRecord
  channelName: string
  userId: string
  onUpdate: (id: string, patch: Record<string, unknown>) => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canAccept =
    space === 'creator' && !order.campaign_id && (order.status === 'new' || order.status === 'payment_pending')
  const services = formatOrderServicesLabel(space, order)
  const amount = formatOrderAmountLabel(space, order)
  const dates = formatPreferredDatesLabel(order.ad_request_preferred_dates)
  const rejection = space === 'advertiser' ? orderRejectionReason(order) : null
  const created = order.created_at
    ? new Date(order.created_at).toLocaleDateString('ru-RU')
    : '—'

  const openOrder = async () => {
    await markDealViewed(supabase, order.id, space)
    router.push(`/dashboard/deal/${order.id}`)
  }

  const transition = async (toStatus: 'accepted' | 'cancelled') => {
    setSaving(true)
    setError(null)
    const result = await postDealTransition(order.id, {
      toStatus,
      paymentStatus: toStatus === 'cancelled' ? 'refunded' : undefined,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onUpdate(order.id, { status: toStatus })
    if (toStatus === 'accepted') {
      router.push(`/dashboard/deal/${order.id}`)
    }
  }

  return (
    <div className="ui-surface ui-surface--pad-sm" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button type="button" onClick={() => void openOrder()} className="text-left" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="ui-card-title">{channelName}</div>
          <DealStatusPill
            status={order.status}
            label={getOrderFlowStatusLabel(
              { status: order.status, campaign_id: order.campaign_id, payment_status: order.payment_status },
              space,
            )}
          />
        </div>
        {space === 'creator' ? (
          <div className="ui-meta" style={{ marginTop: '4px' }}>{order.advertiser_name || 'Рекламодатель'}</div>
        ) : null}
      </button>

      <div className="ui-body">{services}</div>
      {amount ? <div className="text-price-accent">{amount}</div> : null}
      <div className="ui-meta">Предпочтительные даты: {dates}</div>
      <div className="ui-meta">{space === 'advertiser' ? 'Создан' : 'Дата'}: {created}</div>
      {rejection ? <div className="text-red-400 text-sm">Причина отказа: {rejection}</div> : null}
      {error ? <div className="text-red-400 text-sm">{error}</div> : null}

      <div className="flex gap-2 flex-wrap">
        {canAccept ? (
          <>
            <Button type="button" size="sm" disabled={saving} onClick={() => void transition('accepted')}>
              Принять
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => void transition('cancelled')}>
              Отклонить
            </Button>
          </>
        ) : (
          <Link href={`/dashboard/deal/${order.id}`} className="ui-btn ui-btn--ghost ui-btn--sm" style={{ textDecoration: 'none' }}>
            Открыть заказ
          </Link>
        )}
      </div>
    </div>
  )
}
