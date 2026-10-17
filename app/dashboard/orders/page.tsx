'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'
import PageHeader from '@/components/ui/PageHeader'
import MyOrderCard from '@/app/dashboard/components/MyOrderCard'
import { MY_ORDERS_LABEL } from '@/lib/my-orders'
import { filterOrdersForSpace, type OrderListRecord } from '@/lib/my-orders'

export default function MyOrdersPage() {
  const { role } = useDashboard()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [ownedChannelIds, setOwnedChannelIds] = useState<string[]>([])
  const [orders, setOrders] = useState<OrderListRecord[]>([])
  const [channelNames, setChannelNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setUserId(user.id)

      const { data: owned } = await supabase.from('channels').select('id, name').eq('owner_id', user.id)
      const ownedIds = (owned || []).map((channel) => channel.id)
      setOwnedChannelIds(ownedIds)
      const names: Record<string, string> = {}
      ;(owned || []).forEach((channel) => {
        names[channel.id] = channel.name
      })

      let query = supabase
        .from('ad_requests')
        .select(`
          *,
          ad_request_price_snapshots (type, quantity, sort_order, unit_price, currency),
          ad_request_preferred_dates (preferred_on),
          channels (id, name, owner_id)
        `)
        .order('created_at', { ascending: false })

      if (role === 'creator') {
        if (ownedIds.length === 0) {
          setOrders([])
          setLoading(false)
          return
        }
        query = query.in('channel_id', ownedIds)
      } else {
        query = query.eq('advertiser_id', user.id)
      }

      const { data } = await query
      const rows = (data || []) as OrderListRecord[]
      rows.forEach((row) => {
        if (row.channels?.name && row.channel_id) names[row.channel_id] = row.channels.name
      })
      setChannelNames(names)
      setOrders(filterOrdersForSpace(role, rows, { userId: user.id, ownedChannelIds: ownedIds }))
      setLoading(false)
    }
    void load()
  }, [role])

  const visible = filterOrdersForSpace(role, orders, { userId, ownedChannelIds })

  return (
    <div>
      <PageHeader
        title={MY_ORDERS_LABEL}
        description={
          role === 'creator'
            ? 'Заказы на ваши каналы'
            : 'Заказы, которые вы отправили каналам'
        }
      />

      {loading ? (
        <div className="ui-meta text-center py-16">Загрузка...</div>
      ) : visible.length === 0 ? (
        <div className="ui-empty text-center ui-surface ui-surface--pad-lg">
          <div className="ui-empty__title">Заказов пока нет</div>
          <div className="ui-empty__text">
            {role === 'creator'
              ? 'Когда рекламодатель отправит заказ на ваш канал, он появится здесь.'
              : 'Отправьте заказ из маркетплейса — он появится здесь.'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((order) => (
            <MyOrderCard
              key={order.id}
              space={role}
              order={order}
              channelName={
                (order.channel_id && channelNames[order.channel_id]) ||
                order.channels?.name ||
                'Канал'
              }
              userId={userId}
              onUpdate={(id, patch) =>
                setOrders((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
