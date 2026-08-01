'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toUsdEstimate } from '@/lib/currency'
import { getSlotsLabel, isCampaignCollecting, SOCIAL_NETWORK_OPTIONS } from '@/lib/campaigns'
import { FilterLabel, FilterInput, FilterSelect } from '../../components/marketplace/filter-ui'

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
    return <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Загрузка...</div>
  }

  if (error || !campaign) {
    return (
      <div style={{ maxWidth: '680px' }}>
        <Link href="/dashboard/marketplace" className="text-white/50 hover:text-white text-sm mb-6 inline-flex items-center gap-2">← Назад</Link>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/70">{error || 'Кампания не найдена'}</div>
      </div>
    )
  }

  const advertiser = campaign.advertiser_profile
  const advertiserName = advertiser?.full_name || campaign.advertiser_email?.split('@')[0] || 'Рекламодатель'
  const collecting = isCampaignCollecting(campaign)
  const budgetUsd = toUsdEstimate(campaign.budget)
  const networks = campaign.preferred_social_networks || []

  return (
    <div style={{ maxWidth: '680px' }}>
      <Link href="/dashboard/marketplace" className="text-white/50 hover:text-white text-sm mb-6 inline-flex items-center gap-2">← Назад в маркетплейс</Link>

      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
          {advertiser?.avatar_url ? (
            <img src={advertiser.avatar_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--accent-primary, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: '700' }}>
              {advertiserName[0]?.toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Рекламодатель</div>
            <div style={{ color: 'white', fontWeight: '600', fontSize: '16px' }}>{advertiserName}</div>
            {campaign.advertiser_email && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>{campaign.advertiser_email}</div>}
          </div>
          {advertiser?.is_admin ? (
            <span style={{ background: 'rgba(220,38,38,0.2)', color: '#f87171', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px' }}>ADMIN</span>
          ) : advertiser?.subscription_plan === 'pro' ? (
            <span style={{ background: 'rgba(234,179,8,0.15)', color: '#fbbf24', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px' }}>PRO</span>
          ) : null}
        </div>

        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '700', margin: '0 0 12px' }}>{campaign.name}</h1>
        {campaign.description && <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px' }}>{campaign.description}</p>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <span style={{ background: 'rgba(147,51,234,0.15)', color: '#c4b5fd', fontSize: '12px', padding: '4px 10px', borderRadius: '20px' }}>
            {Number(campaign.budget).toLocaleString()} AMD (≈ ${budgetUsd})
          </span>
          {campaign.category && <span className="badge-accent text-xs px-3 py-1 rounded-full">{campaign.category}</span>}
          <span style={{ background: 'rgba(59,130,246,0.12)', color: '#93c5fd', fontSize: '12px', padding: '4px 10px', borderRadius: '20px' }}>{getSlotsLabel(campaign)}</span>
          {campaign.min_subscribers > 0 && (
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', padding: '4px 10px' }}>от {campaign.min_subscribers.toLocaleString()} подп.</span>
          )}
        </div>

        {networks.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {networks.map((net: string) => {
              const opt = SOCIAL_NETWORK_OPTIONS.find((o) => o.value === net)
              return (
                <span key={net} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  <i className={`ti ${opt?.icon}`} style={{ fontSize: '14px' }} /> {opt?.label || net}
                </span>
              )
            })}
          </div>
        )}

        {campaign.collection_deadline && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 12px' }}>
            Дедлайн заявок: {new Date(campaign.collection_deadline).toLocaleDateString('ru-RU')}
          </p>
        )}

        {campaign.brief && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase' }}>Бриф для исполнителя</div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>{campaign.brief}</p>
          </div>
        )}

        {campaign.requirements && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '12px' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Требования: </span>{campaign.requirements}
          </p>
        )}
      </div>

      {collecting ? (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px' }}>
          <h2 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: '0 0 16px' }}>Откликнуться на кампанию</h2>
          {applied ? (
            <p className="text-green-400 text-sm">✓ Отклик отправлен! Рекламодатель рассмотрит вашу заявку.</p>
          ) : userChannels.length === 0 ? (
            <p className="text-white/50 text-sm">
              У вас нет каналов. <Link href="/dashboard/add-channel" className="text-accent hover:underline">Добавить канал</Link>
            </p>
          ) : (
            <>
              <label className="block mb-3">
                <FilterLabel>Выберите канал</FilterLabel>
                <FilterSelect value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                  <option value="" className="bg-[#1a1560]">— Выберите канал —</option>
                  {userChannels.map((ch) => (
                    <option key={ch.id} value={ch.id} className="bg-[#1a1560]">
                      {ch.name} ({ch.subscriber_count?.toLocaleString()} подп.)
                    </option>
                  ))}
                </FilterSelect>
              </label>
              <label className="block mb-3">
                <FilterLabel>Почему ваш канал подходит?</FilterLabel>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                  className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm w-full outline-none focus-accent resize-none placeholder-white/30" />
              </label>
              <label className="block mb-4">
                <FilterLabel>Ваша цена (AMD)</FilterLabel>
                <FilterInput type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
              {applyError && <p className="text-red-400 text-sm mb-3">{applyError}</p>}
              <button type="button" onClick={handleApply} disabled={submitting} className="btn-accent disabled:opacity-50 text-white rounded-full px-6 py-2.5 text-sm font-medium w-full">
                {submitting ? 'Отправка...' : 'Отправить отклик'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', color: 'rgba(255,255,255,0.4)' }}>
          Кампания больше не принимает заявки
        </div>
      )}
    </div>
  )
}
