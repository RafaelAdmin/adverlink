/*
Run in Supabase SQL Editor:

alter table campaigns add column if not exists category text default 'Другое';
alter table campaigns add column if not exists min_subscribers integer default 0;
alter table campaigns add column if not exists advertiser_email text;

alter table ad_requests add column if not exists campaign_id uuid references campaigns(id);

create policy "Anyone can view active campaigns"
on campaigns for select
using (status = 'active');

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

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
      status: 'active',
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

  if (!user) {
    return <div className="text-white/50">Загрузка...</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="text-white/50 hover:text-white transition text-sm mb-8 inline-flex items-center gap-2"
      >
        ← Назад
      </Link>

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
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Что хотите рекламировать</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition resize-none"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Бюджет (в драмах AMD)</span>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="50000"
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
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
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Целевая аудитория</span>
          <input
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Желаемая дата размещения</span>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Категория</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition"
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
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-white/70 text-sm">Особые требования</span>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={2}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition resize-none"
          />
        </label>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-full px-6 py-2.5 text-sm font-medium w-full transition"
      >
        {submitting ? 'Сохранение...' : editId ? 'Сохранить изменения' : 'Опубликовать кампанию'}
      </button>
    </div>
  )
}
