'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ProofLinksList } from '@/app/dashboard/components/DealManagement'
import { SplitPaymentSummary, RefundSummary } from '@/app/dashboard/components/DealExtras'

type DisputeRow = {
  id: string
  advertiser_name: string
  budget: number
  dispute_reason: string | null
  proof_links: string[] | null
  updated_at: string | null
  created_at: string
  channel_id: string | null
  channels?: { name: string; telegram_username: string } | null
}

export default function AdminDisputes({
  onToast,
  onRefresh,
}: {
  onToast: (message: string, type: 'success' | 'error') => void
  onRefresh: () => void
}) {
  const supabase = createClient()
  const [disputes, setDisputes] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Record<string, any[]>>({})
  const [infoText, setInfoText] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ad_requests')
      .select('*, channels(name, telegram_username)')
      .eq('status', 'disputed')
      .order('updated_at', { ascending: false })
    setDisputes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const loadMessages = async (dealId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true })
      .limit(20)
    setMessages((prev) => ({ ...prev, [dealId]: data || [] }))
  }

  const resolve = async (id: string, status: 'resolved_creator' | 'resolved_advertiser') => {
    const { error } = await supabase
      .from('ad_requests')
      .update({ status, completed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      onToast(error.message, 'error')
      return
    }
    onToast('Решение сохранено', 'success')
    load()
    onRefresh()
  }

  const requestInfo = async (dealId: string) => {
    const text = infoText[dealId]?.trim()
    if (!text) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('messages').insert({
      deal_id: dealId,
      sender_id: user.id,
      content: `[Администратор] ${text}`,
    })
    setInfoText((prev) => ({ ...prev, [dealId]: '' }))
    loadMessages(dealId)
    onToast('Сообщение отправлено в чат сделки', 'success')
  }

  if (loading) {
    return <div className="text-white/50 py-12 text-center">Загрузка споров...</div>
  }

  if (disputes.length === 0) {
    return (
      <div className="text-center py-16 text-white/40">
        <div className="text-4xl mb-3">⚖️</div>
        Активных споров нет
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {disputes.map((d) => {
        const channel = d.channels as { name: string; telegram_username: string } | null
        const openedAt = d.updated_at || d.created_at
        const hoursOpen = Math.floor((Date.now() - new Date(openedAt).getTime()) / (1000 * 60 * 60))

        return (
          <div
            key={d.id}
            className="bg-white/5 border border-orange-500/20 rounded-2xl p-6"
          >
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <div>
                <div className="text-white font-semibold">{d.advertiser_name}</div>
                <div className="text-white/50 text-sm">
                  {channel ? `${channel.name} (@${channel.telegram_username})` : 'Канал не указан'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-price-accent font-semibold">{Number(d.budget).toLocaleString()} AMD</div>
                <div className="text-white/40 text-xs">Открыт {hoursOpen}ч назад</div>
              </div>
            </div>

            {d.dispute_reason && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-4">
                <div className="text-orange-400 text-xs mb-1">Причина спора</div>
                <p className="text-white/80 text-sm">{d.dispute_reason}</p>
              </div>
            )}

            <ProofLinksList links={d.proof_links} />

            <button
              type="button"
              onClick={() => loadMessages(d.id)}
              className="text-white/40 text-xs hover:text-white mt-3 mb-2"
            >
              Показать сообщения чата
            </button>
            {(messages[d.id] || []).map((m) => (
              <div key={m.id} className="text-white/60 text-xs py-1 border-b border-white/5">
                {m.content}
              </div>
            ))}

            <textarea
              value={infoText[d.id] || ''}
              onChange={(e) => setInfoText((prev) => ({ ...prev, [d.id]: e.target.value }))}
              placeholder="Запросить доп. информацию..."
              rows={2}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm mt-3 resize-none outline-none"
            />
            <button
              type="button"
              onClick={() => requestInfo(d.id)}
              className="mt-2 text-sm text-white/60 hover:text-white border border-white/20 rounded-full px-4 py-1.5"
            >
              Запросить доп. информацию
            </button>

            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => resolve(d.id, 'resolved_creator')}
                className="flex-1 min-w-[180px] py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: '#16a34a' }}
              >
                Решение в пользу создателя
              </button>
              <button
                type="button"
                onClick={() => resolve(d.id, 'resolved_advertiser')}
                className="flex-1 min-w-[180px] py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: '#dc2626' }}
              >
                Решение в пользу рекламодателя
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 opacity-60 pointer-events-none">
              <SplitPaymentSummary budget={d.budget} />
              <RefundSummary budget={d.budget} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
