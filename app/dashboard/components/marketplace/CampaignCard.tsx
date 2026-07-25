'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Campaign } from '@/lib/database.types'
import { createClient } from '@/lib/supabase'
import { toUsdEstimate } from '@/lib/currency'
import { FilterLabel, FilterInput, FilterSelect } from './filter-ui'

export default function CampaignCard({
  campaign,
  userChannels,
  expanded,
  onToggle,
}: {
  campaign: Campaign
  userChannels: any[]
  expanded: boolean
  onToggle: () => void
}) {
  const [channelId, setChannelId] = useState('')
  const [message, setMessage] = useState('')
  const [price, setPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const budgetUsd = toUsdEstimate(campaign.budget)

  const handleApply = async () => {
    if (!channelId) { setError('Выберите канал'); return }
    if (!message.trim()) { setError('Напишите сообщение'); return }
    setSubmitting(true)
    setError(null)
    const { error: insertError } = await supabase.from('ad_requests').insert({
      channel_id: channelId,
      advertiser_id: campaign.advertiser_id || null,
      advertiser_name: campaign.name,
      advertiser_contact: campaign.advertiser_email,
      advertiser_email: campaign.advertiser_email,
      message: message.trim(),
      budget: Number(price) || 0,
      status: 'new',
      campaign_id: campaign.id,
    })
    setSubmitting(false)
    if (insertError) { setError(insertError.message); return }
    setApplied(true)
  }

  const ApplyForm = () => (
    <div className="panel-accent-soft rounded-xl p-4 mt-4">
      {applied ? (
        <p className="text-green-400 text-sm">✓ Отклик отправлен! Рекламодатель свяжется с тобой.</p>
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
            <FilterLabel>Почему твой канал подходит для этой кампании?</FilterLabel>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm w-full outline-none focus-accent resize-none placeholder-white/30"
            />
          </label>
          <label className="block mb-4">
            <FilterLabel>Ваша цена (AMD)</FilterLabel>
            <FilterInput type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button type="button" onClick={handleApply} disabled={submitting} className="btn-accent disabled:opacity-50 text-white rounded-full px-4 py-2 text-sm">
            {submitting ? 'Отправка...' : 'Отправить отклик'}
          </button>
        </>
      )}
    </div>
  )

  return (
    <div className={`bg-white/5 border rounded-2xl overflow-hidden transition ${expanded ? 'border-accent-expanded shadow-accent-expanded' : 'border-white/10'}`}>
      <button type="button" onClick={onToggle} className="w-full p-6 text-left hover:bg-white/5 transition">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold">{campaign.name}</div>
            <div className="text-white/40 text-sm mt-1">{campaign.advertiser_email}</div>
          </div>
          {campaign.category && (
            <span className="badge-accent text-xs px-3 py-1 rounded-full flex-shrink-0">{campaign.category}</span>
          )}
        </div>
        <div className="text-price-accent mb-2">
          {Number(campaign.budget).toLocaleString()} AMD <span className="text-white/50 font-normal text-sm">≈ ${budgetUsd}</span>
        </div>
        {campaign.min_subscribers > 0 && (
          <div className="text-white/50 text-xs mb-2">Мин. подписчиков: {campaign.min_subscribers.toLocaleString()}</div>
        )}
        {campaign.description && <p className="text-white/70 text-sm line-clamp-3 mb-2">{campaign.description}</p>}
        <div className="text-white/40 text-xs">{new Date(campaign.created_at).toLocaleDateString('ru-RU')}</div>
        {!expanded && (
          <span className="inline-block mt-3 text-white rounded-full px-4 py-1.5 text-sm" style={{ backgroundColor: 'var(--accent-primary)' }}>Откликнуться</span>
        )}
      </button>

      {expanded && (
        <div className="bg-white/[0.03] border-t border-white/20 p-5">
          <div className="space-y-3 text-sm mb-4">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base">{campaign.name}</span>
              {campaign.category && <span className="badge-accent text-xs px-2 py-0.5 rounded-full">{campaign.category}</span>}
            </div>
            {campaign.description && <p className="text-white/80">{campaign.description}</p>}
            <p className="text-price-accent">{Number(campaign.budget).toLocaleString()} AMD (≈ ${budgetUsd})</p>
            {campaign.product_link && (
              <a href={campaign.product_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline break-all block">{campaign.product_link}</a>
            )}
            {campaign.target_audience && <p className="text-white/70"><span className="text-white/50">Аудитория: </span>{campaign.target_audience}</p>}
            {campaign.preferred_date && <p className="text-white/70"><span className="text-white/50">Дата: </span>{new Date(campaign.preferred_date).toLocaleDateString('ru-RU')}</p>}
            {campaign.min_subscribers > 0 && <p className="text-white/70"><span className="text-white/50">Мин. подписчиков: </span>{campaign.min_subscribers.toLocaleString()}</p>}
            {campaign.requirements && <p className="text-white/70"><span className="text-white/50">Требования: </span>{campaign.requirements}</p>}
            {campaign.advertiser_email && <p className="text-white/70"><span className="text-white/50">Контакт: </span>{campaign.advertiser_email}</p>}
          </div>
          <ApplyForm />
        </div>
      )}
    </div>
  )
}
