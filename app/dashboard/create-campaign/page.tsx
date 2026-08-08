/*
Run in Supabase SQL Editor:

alter table campaigns add column if not exists category text default 'Другое';
alter table campaigns add column if not exists min_subscribers integer default 0;
alter table campaigns add column if not exists advertiser_email text;
alter table campaigns add column if not exists slots_total integer default 1;
alter table campaigns add column if not exists slots_filled integer default 0;
alter table campaigns add column if not exists preferred_social_networks text[];
alter table campaigns add column if not exists collection_deadline timestamp with time zone;
alter table campaigns add column if not exists brief text;

alter table ad_requests add column if not exists campaign_id uuid references campaigns(id);
alter table ad_requests add column if not exists payment_status text default 'pending';
alter table ad_requests add column if not exists dispute_reason text;
alter table ad_requests add column if not exists auto_completed boolean default false;
alter table ad_requests add column if not exists platform_commission decimal(5,2) default 10.00;
alter table ad_requests add column if not exists updated_at timestamp with time zone default now();

create policy "Anyone can view active campaigns"
on campaigns for select
using (status in ('active', 'collecting', 'in_progress'));

create policy "Advertisers can insert campaigns"
on campaigns for insert
with check (auth.uid() = advertiser_id);

create policy "Advertisers can update their campaigns"
on campaigns for update
using (auth.uid() = advertiser_id);
*/

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SOCIAL_NETWORK_OPTIONS } from '@/lib/campaigns'
import { CampaignLimitBanner } from '@/app/dashboard/components/LimitCounter'
import { canCreateCampaign, getMonthStart, isProPlan } from '@/lib/subscriptions'
import { useDashboard } from '../layout'

const CATEGORIES = ['Новости', 'Технологии', 'Бизнес', 'Спорт', 'Lifestyle', 'Юмор', 'Другое']

export default function CreateCampaignPage() {
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [user, setUser] = useState<any>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [productLink, setProductLink] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [category, setCategory] = useState('Другое')
  const [minSubscribers, setMinSubscribers] = useState('')
  const [requirements, setRequirements] = useState('')
  const [slotsTotal, setSlotsTotal] = useState('1')
  const [preferredNetworks, setPreferredNetworks] = useState<string[]>(['telegram'])
  const [collectionDeadline, setCollectionDeadline] = useState('')
  const [brief, setBrief] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [campaignsThisMonth, setCampaignsThisMonth] = useState(0)
  const [userIsPro, setUserIsPro] = useState(false)
  const [limitsLoading, setLimitsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { isPro } = useDashboard()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const monthStart = getMonthStart().toISOString()
      const [{ count }, { data: profile }] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('advertiser_id', user.id)
          .gte('created_at', monthStart),
        supabase.from('profiles').select('subscription_plan, is_admin').eq('id', user.id).single(),
      ])
      setCampaignsThisMonth(count || 0)
      setUserIsPro(isProPlan(profile?.subscription_plan, profile?.is_admin) || isPro)
      setLimitsLoading(false)

      if (editId) {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', editId)
          .eq('advertiser_id', user.id)
          .single()

        if (campaign) {
          setName(campaign.name || '')
          setDescription(campaign.description || '')
          setBudget(String(campaign.budget || ''))
          setProductLink(campaign.product_link || '')
          setTargetAudience(campaign.target_audience || '')
          setPreferredDate(campaign.preferred_date || '')
          setCategory(campaign.category || 'Другое')
          setMinSubscribers(campaign.min_subscribers ? String(campaign.min_subscribers) : '')
          setRequirements(campaign.requirements || '')
          setSlotsTotal(String(campaign.slots_total || 1))
          setPreferredNetworks(campaign.preferred_social_networks || ['telegram'])
          setCollectionDeadline(campaign.collection_deadline ? campaign.collection_deadline.split('T')[0] : '')
          setBrief(campaign.brief || '')
        }
      }
    }
    load()
  }, [editId])

  const budgetNum = Number(budget) || 0
  const budgetUsd = Math.round(budgetNum / 385)
  const reqBudget = budgetNum >= 50000

  const handleSubmit = async () => {
    if (!user) return

    if (!editId && !canCreateCampaign(userIsPro, campaignsThisMonth)) {
      setError('Достигнут лимит Free: 3 кампании в месяц. Перейдите на Pro или дождитесь сброса лимита.')
      return
    }

    if (!name.trim()) {
      setError('Укажите название кампании')
      return
    }

    if (!reqBudget) {
      setError('Минимальный бюджет — 50,000 драм')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      advertiser_id: user.id,
      advertiser_email: user.email,
      name: name.trim(),
      description: description.trim() || null,
      budget: budgetNum,
      product_link: productLink.trim() || null,
      target_audience: targetAudience.trim() || null,
      preferred_date: preferredDate || null,
      category,
      min_subscribers: minSubscribers ? Number(minSubscribers) : 0,
      requirements: requirements.trim() || null,
      slots_total: Math.min(20, Math.max(1, Number(slotsTotal) || 1)),
      slots_filled: 0,
      preferred_social_networks: preferredNetworks.length > 0 ? preferredNetworks : ['telegram'],
      collection_deadline: collectionDeadline ? new Date(collectionDeadline).toISOString() : null,
      brief: brief.trim() || null,
      status: 'collecting',
    }

    const { error: saveError } = editId
      ? await supabase.from('campaigns').update(payload).eq('id', editId).eq('advertiser_id', user.id)
      : await supabase.from('campaigns').insert(payload)

    setSubmitting(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    router.push('/dashboard')
  }

  if (!user || limitsLoading) {
    return <div className="text-white/50">Загрузка...</div>
  }

  const atCampaignLimit = !editId && !canCreateCampaign(userIsPro, campaignsThisMonth)

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="text-white/50 hover:text-white transition text-sm mb-8 inline-flex items-center gap-2"
      >
        ← Назад
      </Link>

      {!editId && <CampaignLimitBanner used={campaignsThisMonth} isPro={userIsPro} />}

      <h1 className="text-2xl font-bold text-white mb-2">
        {editId ? 'Редактировать кампанию' : 'Создать рекламную кампанию'}
      </h1>
      <p className="text-white/50 mb-8">
        Опишите кампанию — создатели каналов увидят её в маркетплейсе и смогут откликнуться
      </p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Требования для запуска кампании</h2>
        <ul className="space-y-2 text-sm mb-4">
          <li className={reqBudget ? 'text-green-400' : 'text-red-400'}>
            {reqBudget ? '✓' : '✗'} Минимальный бюджет 50,000 драм
            {budgetNum > 0 && (
              <span className="text-white/40 ml-2">(≈ ${budgetUsd} USD)</span>
            )}
          </li>
        </ul>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-300 text-sm">
          Кампания появится в маркетплейсе для всех создателей. Они сами выберут подходящие каналы и отправят отклики.
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Название кампании</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Что хотите рекламировать</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition resize-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Бюджет (в драмах AMD)</span>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="50000"
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition"
          />
          {budgetNum > 0 && (
            <span className="text-white/50 text-sm">≈ ${budgetUsd} USD</span>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Ссылка на продукт или услугу</span>
          <input
            value={productLink}
            onChange={(e) => setProductLink(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Целевая аудитория</span>
          <input
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Желаемая дата размещения</span>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus-accent transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Категория</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus-accent transition"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-[#1a1560]">{cat}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Минимальное количество подписчиков канала</span>
          <input
            type="number"
            min={0}
            value={minSubscribers}
            onChange={(e) => setMinSubscribers(e.target.value)}
            placeholder="Необязательно"
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Особые требования</span>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={2}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition resize-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Количество каналов</span>
          <span className="text-white/40 text-xs -mt-1">Сколько каналов вам нужно для этой кампании?</span>
          <input
            type="number"
            min={1}
            max={20}
            value={slotsTotal}
            onChange={(e) => setSlotsTotal(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus-accent transition"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Социальные сети</span>
          <span className="text-white/40 text-xs -mt-1">В каких соцсетях планируется реклама?</span>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_NETWORK_OPTIONS.map((opt) => {
              const selected = preferredNetworks.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPreferredNetworks((prev) =>
                      selected ? prev.filter((v) => v !== opt.value) : [...prev, opt.value],
                    )
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition border ${
                    selected
                      ? 'border-accent bg-accent/20 text-white'
                      : 'border-white/20 text-white/50 hover:border-white/40'
                  }`}
                >
                  <i className={`ti ${opt.icon}`} style={{ fontSize: '16px' }} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Дедлайн сбора заявок</span>
          <span className="text-white/40 text-xs -mt-1">До когда принимать заявки от каналов?</span>
          <input
            type="date"
            value={collectionDeadline}
            onChange={(e) => setCollectionDeadline(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus-accent transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Бриф для исполнителя</span>
          <span className="text-white/40 text-xs -mt-1">Что именно нужно опубликовать? Детали для создателя.</span>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            placeholder="Опишите формат поста, ключевые сообщения, ссылки, хештеги..."
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition resize-none"
          />
        </label>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || atCampaignLimit}
        className="btn-accent disabled:opacity-50 text-white rounded-full px-6 py-2.5 text-sm font-medium w-full transition"
      >
        {submitting ? 'Сохранение...' : editId ? 'Сохранить изменения' : 'Опубликовать кампанию'}
      </button>
    </div>
  )
}
