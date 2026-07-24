'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'
import { formatAmdWithUsd, toUsdEstimate, CurrencyCode, formatPrice, getExchangeRates } from '@/lib/currency'
import CurrencySelector from '../components/CurrencySelector'
import { AdvertiserDealCard, CreatorDealCard } from '../components/DealManagement'

const CAMPAIGN_CATEGORIES = ['Все', 'Новости', 'Технологии', 'Бизнес', 'Спорт', 'Lifestyle', 'Юмор', 'Другое']
const FORMATS = ['Все', 'Пост', 'Репост', 'Закреп', 'Пакет']
const COUNTRIES = [
  { value: 'Все', label: 'Все' },
  { value: 'AM', label: 'AM (Армения)' },
  { value: 'RU', label: 'RU (Россия)' },
  { value: 'GE', label: 'GE (Грузия)' },
]
const LANGUAGES = [
  { value: 'Все', label: 'Все' },
  { value: 'ru', label: 'ru (Русский)' },
  { value: 'hy', label: 'hy (Армянский)' },
  { value: 'en', label: 'en (English)' },
]

function FilterLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-white/50 text-xs mb-1 block">{children}</span>
}

function FilterInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm w-full outline-none focus-accent transition placeholder-white/30"
    />
  )
}

function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm w-full outline-none focus-accent transition"
    />
  )
}

function ChannelAvatar({ channel }: { channel: any }) {
  if (channel.avatar_url) {
    return (
      <img src={channel.avatar_url} alt={channel.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full avatar-accent-fallback flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
      {channel.name[0]}
    </div>
  )
}

function openTelegram(contact: string) {
  if (!contact) return
  const username = contact.startsWith('@') ? contact.slice(1) : contact
  window.open(`https://t.me/${username}`, '_blank')
}

function StatusToast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="fixed top-4 right-4 z-50 bg-green-500/20 border border-green-500/40 text-green-400 px-4 py-2 rounded-xl text-sm shadow-lg">
      {message}
    </div>
  )
}

// ─── CREATOR: campaign cards ────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  userChannels,
  expanded,
  onToggle,
}: {
  campaign: any
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


// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────

export default function DashboardMarketplacePage() {
  const { role } = useDashboard()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')

  // Creator state
  const [creatorTab, setCreatorTab] = useState<'mine' | 'campaigns'>('mine')
  const [myAdRequests, setMyAdRequests] = useState<any[]>([])
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([])
  const [userChannels, setUserChannels] = useState<any[]>([])
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [showCampaignFilters, setShowCampaignFilters] = useState(false)
  const [cfCategory, setCfCategory] = useState('Все')
  const [cfMinBudget, setCfMinBudget] = useState('')
  const [cfMaxBudget, setCfMaxBudget] = useState('')
  const [cfMinSubs, setCfMinSubs] = useState('')
  const [cfMaxSubs, setCfMaxSubs] = useState('')
  const [cfDateFrom, setCfDateFrom] = useState('')
  const [cfDateTo, setCfDateTo] = useState('')
  const [cfFormat, setCfFormat] = useState('Все')

  // Advertiser state
  const [advertiserTab, setAdvertiserTab] = useState<'catalog' | 'requests'>('catalog')
  const [channels, setChannels] = useState<any[]>([])
  const [sentRequests, setSentRequests] = useState<any[]>([])
  const [channelMap, setChannelMap] = useState<Record<string, any>>({})
  const [myChannelIds, setMyChannelIds] = useState<string[]>([])
  const [showChannelFilters, setShowChannelFilters] = useState(false)
  const [chMinSubs, setChMinSubs] = useState('')
  const [chMaxSubs, setChMaxSubs] = useState('')
  const [chMinViews, setChMinViews] = useState('')
  const [chMaxViews, setChMaxViews] = useState('')
  const [chMinEngagement, setChMinEngagement] = useState('')
  const [chCountry, setChCountry] = useState('Все')
  const [chLanguage, setChLanguage] = useState('Все')
  const [chMinPrice, setChMinPrice] = useState('')
  const [chMaxPrice, setChMaxPrice] = useState('')
  const [chVerifiedOnly, setChVerifiedOnly] = useState(false)
  const [chSort, setChSort] = useState('date')
  const [toast, setToast] = useState<string | null>(null)
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('USD')
  const [rates, setRates] = useState<Record<string, number>>({})

  const creatorChannelMap = Object.fromEntries(userChannels.map((c) => [c.id, c]))

  useEffect(() => {
    getExchangeRates().then(setRates)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = () => setToast('✓ Статус обновлён')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      if (role === 'creator') {
        const { data: uc } = await supabase.from('channels').select('*').eq('owner_id', user.id)
        setUserChannels(uc || [])
        const channelIds = (uc || []).map((c) => c.id)

        if (channelIds.length > 0) {
          const { data: mine } = await supabase
            .from('ad_requests')
            .select('*, channels(name, avatar_url)')
            .in('channel_id', channelIds)
            .order('created_at', { ascending: false })

          setMyAdRequests(mine || [])
        } else {
          setMyAdRequests([])
        }

        const { data: camps } = await supabase
          .from('campaigns')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
        setActiveCampaigns(camps || [])
      } else {
        const { data: ch } = await supabase
          .from('channels')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        setChannels(ch || [])
        const map: Record<string, any> = {}
        ;(ch || []).forEach((c) => {
          map[c.id] = c
        })
        setChannelMap(map)

        const { data: myChannels } = await supabase
          .from('channels')
          .select('id')
          .eq('owner_id', user.id)
        setMyChannelIds((myChannels || []).map((c) => c.id))

        const { data: sent } = await supabase
          .from('ad_requests')
          .select('*')
          .eq('advertiser_id', user.id)
          .order('created_at', { ascending: false })
        setSentRequests(sent || [])
      }
      setLoading(false)
    }
    load()
  }, [role])

  const updateRequest = (id: string, patch: Record<string, unknown>) => {
    if (role === 'creator') {
      setMyAdRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    } else {
      setSentRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    }
  }

  // Creator filters
  const filteredCreatorRequests = myAdRequests.filter((r) => {
    const q = search.toLowerCase()
    return !q || r.advertiser_name?.toLowerCase().includes(q) || r.advertiser_contact?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q)
  })

  const filteredCampaigns = activeCampaigns.filter((c) => {
    const q = search.toLowerCase()
    if (q && !c.name?.toLowerCase().includes(q) && !c.description?.toLowerCase().includes(q) && !c.category?.toLowerCase().includes(q)) return false
    if (cfCategory !== 'Все' && c.category !== cfCategory) return false
    if (cfMinBudget && Number(c.budget) < Number(cfMinBudget)) return false
    if (cfMaxBudget && Number(c.budget) > Number(cfMaxBudget)) return false
    if (cfMinSubs && (c.min_subscribers || 0) < Number(cfMinSubs)) return false
    if (cfMaxSubs && (c.min_subscribers || 0) > Number(cfMaxSubs)) return false
    if (cfDateFrom && c.preferred_date && new Date(c.preferred_date) < new Date(cfDateFrom)) return false
    if (cfDateTo && c.preferred_date && new Date(c.preferred_date) > new Date(cfDateTo)) return false
    if (cfFormat !== 'Все' && c.format && c.format !== cfFormat) return false
    return true
  })

  const resetCampaignFilters = () => {
    setCfCategory('Все'); setCfMinBudget(''); setCfMaxBudget('')
    setCfMinSubs(''); setCfMaxSubs(''); setCfDateFrom(''); setCfDateTo(''); setCfFormat('Все')
  }

  // Advertiser channel filters
  let filteredChannels = channels.filter((ch) => {
    const q = search.toLowerCase()
    if (q && !ch.name?.toLowerCase().includes(q) && !ch.telegram_username?.toLowerCase().includes(q)) return false
    if (chMinSubs && (ch.subscriber_count || 0) < Number(chMinSubs)) return false
    if (chMaxSubs && (ch.subscriber_count || 0) > Number(chMaxSubs)) return false
    if (chMinViews && (ch.avg_views || 0) < Number(chMinViews)) return false
    if (chMaxViews && (ch.avg_views || 0) > Number(chMaxViews)) return false
    if (chMinEngagement && (ch.engagement_rate || 0) < Number(chMinEngagement)) return false
    if (chCountry !== 'Все' && ch.country !== chCountry) return false
    if (chLanguage !== 'Все' && ch.language !== chLanguage) return false
    if (chMinPrice && (ch.ad_price || 0) < Number(chMinPrice)) return false
    if (chMaxPrice && (ch.ad_price || 0) > Number(chMaxPrice)) return false
    if (chVerifiedOnly && !ch.is_verified && ch.verification_status !== 'verified') return false
    return true
  })

  filteredChannels = [...filteredChannels].sort((a, b) => {
    if (chSort === 'subs') return (b.subscriber_count || 0) - (a.subscriber_count || 0)
    if (chSort === 'price_asc') return (a.ad_price || 0) - (b.ad_price || 0)
    if (chSort === 'price_desc') return (b.ad_price || 0) - (a.ad_price || 0)
    if (chSort === 'engagement') return (b.engagement_rate || 0) - (a.engagement_rate || 0)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const resetChannelFilters = () => {
    setChMinSubs(''); setChMaxSubs(''); setChMinViews(''); setChMaxViews('')
    setChMinEngagement(''); setChCountry('Все'); setChLanguage('Все')
    setChMinPrice(''); setChMaxPrice(''); setChVerifiedOnly(false); setChSort('date')
  }

  const convertChannelPrice = (price: number, fromCurrency: string = 'USD'): string => {
    if (!price) return 'По запросу'
    if (!rates[fromCurrency] || !rates[displayCurrency]) {
      return formatPrice(price, fromCurrency as CurrencyCode)
    }
    const inUSD = price / rates[fromCurrency]
    const converted = Math.round(inUSD * rates[displayCurrency])
    return formatPrice(converted, displayCurrency)
  }

  const filteredSentRequests = sentRequests.filter((r) => {
    const ch = channelMap[r.channel_id]
    const q = search.toLowerCase()
    return !q || ch?.name?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q)
  })

  // ─── ADVERTISER VIEW ──────────────────────────────────────────────────────────

  if (role === 'advertiser') {
    return (
      <div>
        <StatusToast message={toast} />
        <h1 className="text-2xl font-bold text-white mb-2">Маркетплейс</h1>
        <p className="text-white/50 mb-6">Каталог каналов и ваши запросы</p>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setAdvertiserTab('catalog')} className={`rounded-full px-4 py-2 text-sm transition ${advertiserTab === 'catalog' ? 'tab-pill-active' : 'border border-white/20 text-white/70'}`}>
            Каталог каналов
          </button>
          <button onClick={() => setAdvertiserTab('requests')} className={`rounded-full px-4 py-2 text-sm transition ${advertiserTab === 'requests' ? 'tab-pill-active' : 'border border-white/20 text-white/70'}`}>
            Мои запросы
          </button>
        </div>

        <input
          placeholder={advertiserTab === 'catalog' ? 'Поиск по названию или username...' : 'Поиск по каналу или сообщению...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/30 outline-none focus-accent transition mb-4"
        />

        {advertiserTab === 'catalog' && (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                Показывать цены в:
              </span>
              <CurrencySelector
                value={displayCurrency}
                onChange={setDisplayCurrency}
                size="sm"
              />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                Курс обновляется ежедневно
              </span>
            </div>

            <button type="button" onClick={() => setShowChannelFilters(!showChannelFilters)} className="border border-white/20 text-white/70 rounded-full px-4 py-2 text-sm mb-4 hover:text-white transition">
              Фильтры {showChannelFilters ? '▲' : '▼'}
            </button>

            {showChannelFilters && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label><FilterLabel>Мин. подписчиков</FilterLabel><FilterInput type="number" value={chMinSubs} onChange={(e) => setChMinSubs(e.target.value)} /></label>
                  <label><FilterLabel>Макс. подписчиков</FilterLabel><FilterInput type="number" value={chMaxSubs} onChange={(e) => setChMaxSubs(e.target.value)} /></label>
                  <label><FilterLabel>Мин. просмотры</FilterLabel><FilterInput type="number" value={chMinViews} onChange={(e) => setChMinViews(e.target.value)} /></label>
                  <label><FilterLabel>Макс. просмотры</FilterLabel><FilterInput type="number" value={chMaxViews} onChange={(e) => setChMaxViews(e.target.value)} /></label>
                  <label><FilterLabel>Вовлечённость от %</FilterLabel><FilterInput type="number" value={chMinEngagement} onChange={(e) => setChMinEngagement(e.target.value)} /></label>
                  <label><FilterLabel>Страна</FilterLabel><FilterSelect value={chCountry} onChange={(e) => setChCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c.value} value={c.value} className="bg-[#1a1560]">{c.label}</option>)}</FilterSelect></label>
                  <label><FilterLabel>Язык</FilterLabel><FilterSelect value={chLanguage} onChange={(e) => setChLanguage(e.target.value)}>{LANGUAGES.map((l) => <option key={l.value} value={l.value} className="bg-[#1a1560]">{l.label}</option>)}</FilterSelect></label>
                  <label><FilterLabel>Мин. цена $</FilterLabel><FilterInput type="number" value={chMinPrice} onChange={(e) => setChMinPrice(e.target.value)} /></label>
                  <label><FilterLabel>Макс. цена $</FilterLabel><FilterInput type="number" value={chMaxPrice} onChange={(e) => setChMaxPrice(e.target.value)} /></label>
                  <label><FilterLabel>Сортировка</FilterLabel>
                    <FilterSelect value={chSort} onChange={(e) => setChSort(e.target.value)}>
                      <option value="date" className="bg-[#1a1560]">По дате</option>
                      <option value="subs" className="bg-[#1a1560]">По подписчикам</option>
                      <option value="price_asc" className="bg-[#1a1560]">По цене (возрастание)</option>
                      <option value="price_desc" className="bg-[#1a1560]">По цене (убывание)</option>
                      <option value="engagement" className="bg-[#1a1560]">По вовлечённости</option>
                    </FilterSelect>
                  </label>
                  <label className="flex items-center gap-2 pt-5">
                    <input type="checkbox" checked={chVerifiedOnly} onChange={(e) => setChVerifiedOnly(e.target.checked)} className="rounded" />
                    <span className="text-white/70 text-sm">Только верифицированные</span>
                  </label>
                </div>
                <button type="button" onClick={resetChannelFilters} className="border border-white/20 text-white/50 rounded-full px-3 py-1.5 text-xs mt-4 hover:text-white">
                  Сбросить фильтры
                </button>
              </div>
            )}

            {loading ? (
              <div className="text-white/50 text-center py-24">Загрузка...</div>
            ) : filteredChannels.length === 0 ? (
              <div className="text-center py-24">
                <i className="ti ti-search" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />
                <div className="text-white font-medium mb-2">Каналов не найдено</div>
                <div className="text-white/40 text-sm">Попробуй изменить фильтры</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChannels.map((channel) => (
                  <Link key={channel.id} href={`/dashboard/channel/${channel.id}`} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover-border-accent transition cursor-pointer block">
                    <div className="flex items-center gap-4 mb-4">
                      <ChannelAvatar channel={channel} />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">{channel.name}</div>
                        <div className="text-white/40 text-sm">@{channel.telegram_username}</div>
                      </div>
                      {(channel.is_verified || channel.verification_status === 'verified') && (
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">✓</span>
                      )}
                    </div>
                    {channel.description && <p className="text-white/50 text-sm mb-4 line-clamp-2">{channel.description}</p>}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-white text-sm font-semibold">{channel.subscriber_count >= 1000 ? `${(channel.subscriber_count / 1000).toFixed(1)}K` : channel.subscriber_count}</div>
                        <div className="text-white/40 text-xs">подписчиков</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-white text-sm font-semibold">{channel.avg_views >= 1000 ? `${(channel.avg_views / 1000).toFixed(1)}K` : channel.avg_views}</div>
                        <div className="text-white/40 text-xs">охваты</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-2 text-center">
                        <div className="text-white text-sm font-semibold">{channel.engagement_rate || 0}%</div>
                        <div className="text-white/40 text-xs">вовлечённость</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-price-accent">
                        {channel.ad_price
                          ? `от ${convertChannelPrice(channel.ad_price, channel.ad_price_currency || 'USD')}`
                          : 'Цена по запросу'}
                      </div>
                      {myChannelIds.includes(channel.id) ? (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'rgba(255,255,255,0.25)',
                            padding: '6px 12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '20px',
                          }}
                        >
                          Ваш канал
                        </span>
                      ) : (
                        <Link
                          href={`/dashboard/add-channel/request-ad?channelId=${channel.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="btn-accent transition text-white px-4 py-1.5 rounded-full text-sm"
                        >
                          Запросить рекламу
                        </Link>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {advertiserTab === 'requests' && (
          loading ? (
            <div className="text-white/50 text-center py-24">Загрузка...</div>
          ) : filteredSentRequests.length === 0 ? (
            <div className="text-center py-24">
              <i className="ti ti-clipboard-list" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />
              <div className="text-white font-medium mb-2">Запросов не найдено</div>
              <div className="text-white/40 text-sm">Вы ещё не отправляли запросов на каналы</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredSentRequests.map((req) => (
                <AdvertiserDealCard
                  key={req.id}
                  request={req}
                  channelMap={channelMap}
                  userId={userId}
                  onUpdate={(id, patch) => {
                    updateRequest(id, patch)
                    showToast()
                  }}
                  linkToDeal
                />
              ))}
            </div>
          )
        )}
      </div>
    )
  }

  // ─── CREATOR VIEW ─────────────────────────────────────────────────────────────

  return (
    <div>
      <StatusToast message={toast} />
      <h1 className="text-2xl font-bold text-white mb-2">Маркетплейс</h1>
      <p className="text-white/50 mb-6">Входящие запросы и кампании рекламодателей</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setCreatorTab('mine')} className={`rounded-full px-4 py-2 text-sm transition ${creatorTab === 'mine' ? 'tab-pill-active' : 'border border-white/20 text-white/70'}`}>
          Мои запросы
        </button>
        <button onClick={() => setCreatorTab('campaigns')} className={`rounded-full px-4 py-2 text-sm transition ${creatorTab === 'campaigns' ? 'tab-pill-active' : 'border border-white/20 text-white/70'}`}>
          Запросы рекламодателей
        </button>
      </div>

      <input
        placeholder={creatorTab === 'mine' ? 'Поиск по имени, контакту или сообщению...' : 'Поиск по названию, категории или описанию...'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/30 outline-none focus-accent transition mb-4"
      />

      {creatorTab === 'mine' && (
        loading ? (
          <div className="text-white/50 text-center py-24">Загрузка...</div>
        ) : filteredCreatorRequests.length === 0 ? (
          <div className="text-center py-24">
            <i className="ti ti-clipboard-list" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />
            <div className="text-white font-medium mb-2">Запросов не найдено</div>
            <div className="text-white/40 text-sm">Пока нет запросов на ваши каналы</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredCreatorRequests.map((req) => (
              <CreatorDealCard
                key={req.id}
                request={req}
                channelMap={creatorChannelMap}
                userId={userId}
                onUpdate={(id, patch) => {
                  updateRequest(id, patch)
                  showToast()
                }}
                linkToDeal
              />
            ))}
          </div>
        )
      )}

      {creatorTab === 'campaigns' && (
        <>
          <button type="button" onClick={() => setShowCampaignFilters(!showCampaignFilters)} className="border border-white/20 text-white/70 rounded-full px-4 py-2 text-sm mb-4 hover:text-white transition">
            Фильтры {showCampaignFilters ? '▲' : '▼'}
          </button>

          {showCampaignFilters && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <label><FilterLabel>Тематика</FilterLabel>
                  <FilterSelect value={cfCategory} onChange={(e) => setCfCategory(e.target.value)}>
                    {CAMPAIGN_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#1a1560]">{c}</option>)}
                  </FilterSelect>
                </label>
                <label><FilterLabel>Минимальный бюджет (AMD)</FilterLabel><FilterInput type="number" value={cfMinBudget} onChange={(e) => setCfMinBudget(e.target.value)} /></label>
                <label><FilterLabel>Максимальный бюджет (AMD)</FilterLabel><FilterInput type="number" value={cfMaxBudget} onChange={(e) => setCfMaxBudget(e.target.value)} /></label>
                <label><FilterLabel>Мин. подписчиков канала</FilterLabel><FilterInput type="number" value={cfMinSubs} onChange={(e) => setCfMinSubs(e.target.value)} /></label>
                <label><FilterLabel>Макс. подписчиков канала</FilterLabel><FilterInput type="number" value={cfMaxSubs} onChange={(e) => setCfMaxSubs(e.target.value)} /></label>
                <label><FilterLabel>Дата от</FilterLabel><FilterInput type="date" value={cfDateFrom} onChange={(e) => setCfDateFrom(e.target.value)} /></label>
                <label><FilterLabel>Дата до</FilterLabel><FilterInput type="date" value={cfDateTo} onChange={(e) => setCfDateTo(e.target.value)} /></label>
                <label><FilterLabel>Формат</FilterLabel>
                  <FilterSelect value={cfFormat} onChange={(e) => setCfFormat(e.target.value)}>
                    {FORMATS.map((f) => <option key={f} value={f} className="bg-[#1a1560]">{f}</option>)}
                  </FilterSelect>
                </label>
              </div>
              <button type="button" onClick={resetCampaignFilters} className="border border-white/20 text-white/50 rounded-full px-3 py-1.5 text-xs mt-4 hover:text-white">
                Сбросить
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-white/50 text-center py-24">Загрузка...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-24">
              <i className="ti ti-speakerphone" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />
              <div className="text-white font-medium mb-2">Кампаний не найдено</div>
              <div className="text-white/40 text-sm">Попробуй изменить фильтры</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  userChannels={userChannels}
                  expanded={expandedCampaignId === campaign.id}
                  onToggle={() => setExpandedCampaignId(expandedCampaignId === campaign.id ? null : campaign.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
