'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toUsdEstimate } from '@/lib/currency'
import { getSlotsLabel, isCampaignCollecting, SOCIAL_NETWORK_OPTIONS } from '@/lib/campaigns'
import { FilterLabel, FilterInput, FilterSelect } from '../../components/marketplace/filter-ui'
import Surface from '@/components/ui/Surface'
import Button from '@/components/ui/Button'

export default function CampaignDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [campaign, setCampaign] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [userChannels, setUserChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [channelId, setChannelId] = useState('')
  const [message, setMessage] = useState('')
  const [price, setPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/auth/login'); return }
      setUser(authUser)

      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select(`
          *,
          advertiser_profile:profiles!advertiser_id(full_name, avatar_url, subscription_plan, is_admin)
        `)
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('Кампания не найдена')
      } else {
        setCampaign(data)
        setPrice(String(data.budget || ''))
      }

      const { data: channels } = await supabase.from('channels').select('*').eq('owner_id', authUser.id)
      setUserChannels(channels || [])
      setLoading(false)
    }
    load()
  }, [id])

  const handleApply = async () => {
    if (!campaign || !user) return
    if (!isCampaignCollecting(campaign)) {
      setApplyError('Кампания больше не принимает заявки')
      return
    }
    if (!channelId) { setApplyError('Выберите канал'); return }
    if (!message.trim()) { setApplyError('Напишите сообщение'); return }

    setSubmitting(true)
    setApplyError(null)

    const { error: insertError } = await supabase.from('ad_requests').insert({
      channel_id: channelId,
      campaign_id: campaign.id,
      advertiser_id: campaign.advertiser_id,
      advertiser_name: campaign.name,
      advertiser_contact: campaign.advertiser_email,
      advertiser_email: campaign.advertiser_email,
      message: message.trim(),
      budget: Number(price) || Number(campaign.budget) || 0,
      status: 'new',
    })

    setSubmitting(false)
    if (insertError) { setApplyError(insertError.message); return }
    setApplied(true)
  }

  if (loading) {
    return <div className="ui-meta text-center py-16">Загрузка...</div>
  }

  if (error || !campaign) {
    return (
      <div>
        <Link href="/dashboard/marketplace" className="ui-meta mb-6 inline-flex items-center gap-2 hover:opacity-80 transition">← Назад</Link>
        <Surface padding="lg" className="text-center ui-body">{error || 'Кампания не найдена'}</Surface>
      </div>
    )
  }

  const advertiser = campaign.advertiser_profile
  const advertiserName = advertiser?.full_name || campaign.advertiser_email?.split('@')[0] || 'Рекламодатель'
  const collecting = isCampaignCollecting(campaign)
  const budgetUsd = toUsdEstimate(campaign.budget)
  const networks = campaign.preferred_social_networks || []

  return (
    <div>
      <Link href="/dashboard/marketplace" className="ui-meta mb-6 inline-flex items-center gap-2 hover:opacity-80 transition">← Назад в маркетплейс</Link>

      <Surface padding="lg" className="mb-4">
        <div className="flex gap-4 items-start mb-5">
          {advertiser?.avatar_url ? (
            <img src={advertiser.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}>
              {advertiserName[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="ui-meta">Рекламодатель</div>
            <div className="ui-card-title">{advertiserName}</div>
            {campaign.advertiser_email && <div className="ui-meta">{campaign.advertiser_email}</div>}
          </div>
          {advertiser?.is_admin ? (
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(220,38,38,0.2)', color: '#f87171' }}>ADMIN</span>
          ) : advertiser?.subscription_plan === 'pro' ? (
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.15)', color: '#fbbf24' }}>PRO</span>
          ) : null}
        </div>

        <h1 className="ui-page-title mb-3">{campaign.name}</h1>
        {campaign.description && <p className="ui-body mb-4" style={{ lineHeight: 1.6 }}>{campaign.description}</p>}

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(147,51,234,0.15)', color: '#c4b5fd' }}>
            {Number(campaign.budget).toLocaleString()} AMD (≈ ${budgetUsd})
          </span>
          {campaign.category && <span className="badge-accent text-xs px-3 py-1 rounded-full">{campaign.category}</span>}
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd' }}>{getSlotsLabel(campaign)}</span>
          {campaign.min_subscribers > 0 && (
            <span className="ui-meta text-xs px-2.5 py-1">от {campaign.min_subscribers.toLocaleString()} подп.</span>
          )}
        </div>

        {networks.length > 0 && (
          <div className="flex gap-2 mb-3">
            {networks.map((net: string) => {
              const opt = SOCIAL_NETWORK_OPTIONS.find((o) => o.value === net)
              return (
                <span key={net} className="ui-meta text-xs px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: 'var(--surface)' }}>
                  <i className={`ti ${opt?.icon}`} style={{ fontSize: '14px' }} /> {opt?.label || net}
                </span>
              )
            })}
          </div>
        )}

        {campaign.collection_deadline && (
          <p className="ui-meta mb-3">
            Дедлайн заявок: {new Date(campaign.collection_deadline).toLocaleDateString('ru-RU')}
          </p>
        )}

        {campaign.brief && (
          <div className="ui-surface ui-surface--pad-sm mt-3">
            <div className="ui-meta uppercase mb-1.5" style={{ fontSize: '11px' }}>Бриф для исполнителя</div>
            <p className="ui-body m-0" style={{ lineHeight: 1.5 }}>{campaign.brief}</p>
          </div>
        )}

        {campaign.requirements && (
          <p className="ui-meta mt-3">
            <span>Требования: </span>{campaign.requirements}
          </p>
        )}
      </Surface>

      {collecting ? (
        <Surface padding="md">
          <h2 className="ui-section-title mb-4">Откликнуться на кампанию</h2>
          {applied ? (
            <p className="text-green-400 text-sm">✓ Отклик отправлен! Рекламодатель рассмотрит вашу заявку.</p>
          ) : userChannels.length === 0 ? (
            <p className="ui-meta text-sm">
              У вас нет каналов. <Link href="/dashboard/add-channel" className="text-accent hover:underline">Добавить канал</Link>
            </p>
          ) : (
            <>
              <label className="block mb-3">
                <FilterLabel>Выберите канал</FilterLabel>
                <FilterSelect value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                  <option value="">— Выберите канал —</option>
                  {userChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} ({ch.subscriber_count?.toLocaleString()} подп.)
                    </option>
                  ))}
                </FilterSelect>
              </label>
              <label className="block mb-3">
                <FilterLabel>Почему ваш канал подходит?</FilterLabel>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="ui-input ui-textarea w-full" />
              </label>
              <label className="block mb-4">
                <FilterLabel>Ваша цена (AMD)</FilterLabel>
                <FilterInput type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
              {applyError && <p className="text-red-400 text-sm mb-3">{applyError}</p>}
              <Button type="button" onClick={handleApply} disabled={submitting} fullWidth>
                {submitting ? 'Отправка...' : 'Отправить отклик'}
              </Button>
            </>
          )}
        </Surface>
      ) : (
        <Surface padding="md" className="text-center ui-meta">
          Кампания больше не принимает заявки
        </Surface>
      )}
    </div>
  )
}
