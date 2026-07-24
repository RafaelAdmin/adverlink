'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'
import { formatAmdWithUsd, toUsdEstimate, CurrencyCode, formatPrice, getExchangeRates, getCurrencySymbol } from '@/lib/currency'
import CurrencySelector from '../components/CurrencySelector'
import FilterDropdown from '../components/FilterDropdown'
import { AdvertiserDealCard, CreatorDealCard } from '../components/DealManagement'

const ADVERTISER_SORT_OPTIONS = [
  { value: 'newest', label: 'Новые' },
  { value: 'subscribers_desc', label: 'Подписчики ↓' },
  { value: 'subscribers_asc', label: 'Подписчики ↑' },
  { value: 'price_desc', label: 'Цена ↓' },
  { value: 'price_asc', label: 'Цена ↑' },
  { value: 'views_desc', label: 'Охваты ↓' },
]

const CAMPAIGN_SORT_OPTIONS = [
  { value: 'newest', label: 'Новые' },
  { value: 'budget_desc', label: 'Бюджет ↓' },
  { value: 'budget_asc', label: 'Бюджет ↑' },
  { value: 'subs_desc', label: 'Подписчики ↓' },
]

const COUNTRY_FILTER_OPTIONS = [
  { value: 'all', label: 'Все страны', icon: '🌐' },
  { value: 'AM', label: 'Армения', icon: '🇦🇲' },
  { value: 'RU', label: 'Россия', icon: '🇷🇺' },
  { value: 'GE', label: 'Грузия', icon: '🇬🇪' },
  { value: 'KZ', label: 'Казахстан', icon: '🇰🇿' },
  { value: 'UA', label: 'Украина', icon: '🇺🇦' },
]

const SOCIAL_FILTER_OPTIONS = [
  { value: 'all', label: 'Все соцсети', icon: '🌐' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
  { value: 'youtube', label: 'YouTube', icon: '▶️' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
]

const CAMPAIGN_CATEGORIES = ['Все', 'Новости', 'Технологии', 'Бизнес', 'Спорт', 'Lifestyle', 'Юмор', 'Другое']
const FORMATS = ['Все', 'Пост', 'Репост', 'Закреп', 'Пакет']

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
  const [minBudget, setMinBudget] = useState(0)
  const [maxBudget, setMaxBudget] = useState(10000000)
  const [minRequiredSubs, setMinRequiredSubs] = useState(0)
  const [maxRequiredSubs, setMaxRequiredSubs] = useState(1000000)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterCountry, setFilterCountry] = useState('all')
  const [filterSocialNet, setFilterSocialNet] = useState('all')
  const [campaignSortBy, setCampaignSortBy] = useState('newest')
  const [showCampaignFilters, setShowCampaignFilters] = useState(false)

  // Advertiser state
  const [advertiserTab, setAdvertiserTab] = useState<'catalog' | 'requests'>('catalog')
  const [channels, setChannels] = useState<any[]>([])
  const [sentRequests, setSentRequests] = useState<any[]>([])
  const [channelMap, setChannelMap] = useState<Record<string, any>>({})
  const [myChannelIds, setMyChannelIds] = useState<string[]>([])
  const [minSubs, setMinSubs] = useState(0)
  const [maxSubs, setMaxSubs] = useState(1000000)
  const [minViews, setMinViews] = useState(0)
  const [maxViews, setMaxViews] = useState(500000)
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(10000)
  const [selectedSocialNet, setSelectedSocialNet] = useState('all')
  const [selectedCountry, setSelectedCountry] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
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

  const filteredCampaigns = activeCampaigns
    .filter((req) => {
      const q = search.toLowerCase()
      const matchSearch = req.advertiser_name?.toLowerCase().includes(q) ||
        req.advertiser_contact?.toLowerCase().includes(q) ||
        req.message?.toLowerCase().includes(q) ||
        req.name?.toLowerCase().includes(q) ||
        req.description?.toLowerCase().includes(q)

      const budget = req.budget || 0
      const matchBudget = budget >= minBudget && budget <= maxBudget

      const reqSubs = req.min_subscribers || 0
      const matchSubs = reqSubs >= minRequiredSubs && reqSubs <= maxRequiredSubs

      const matchDate = (!dateFrom || !req.preferred_date || req.preferred_date >= dateFrom) &&
        (!dateTo || !req.preferred_date || req.preferred_date <= dateTo)

      const matchCountry = filterCountry === 'all' || (req.country || '') === filterCountry
      const matchSocial = filterSocialNet === 'all' ||
        (req.platform || 'telegram') === filterSocialNet

      return matchSearch && matchBudget && matchSubs && matchDate && matchCountry && matchSocial
    })
    .sort((a, b) => {
      switch (campaignSortBy) {
        case 'budget_desc': return (b.budget || 0) - (a.budget || 0)
        case 'budget_asc': return (a.budget || 0) - (b.budget || 0)
        case 'subs_desc': return (b.min_subscribers || 0) - (a.min_subscribers || 0)
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const filteredChannels = channels
    .filter((ch) => {
      const matchSearch = ch.name?.toLowerCase().includes(search.toLowerCase()) ||
        ch.telegram_username?.toLowerCase().includes(search.toLowerCase())
      const matchSubs = (ch.subscriber_count || 0) >= minSubs && (ch.subscriber_count || 0) <= maxSubs
      const matchViews = (ch.avg_views || 0) >= minViews && (ch.avg_views || 0) <= maxViews

      const channelPriceInDisplayCurrency = ch.ad_price
        ? Math.round((ch.ad_price / (rates[ch.ad_price_currency || 'USD'] || 1)) * (rates[displayCurrency] || 1))
        : 0
      const matchPrice = !ch.ad_price || (channelPriceInDisplayCurrency >= minPrice && channelPriceInDisplayCurrency <= maxPrice)

      const matchSocial = selectedSocialNet === 'all' ||
        (ch.platform || 'telegram') === selectedSocialNet

      const matchCountry = selectedCountry === 'all' ||
        (ch.country || '') === selectedCountry

      return matchSearch && matchSubs && matchViews && matchPrice && matchSocial && matchCountry
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'subscribers_desc': return (b.subscriber_count || 0) - (a.subscriber_count || 0)
        case 'subscribers_asc': return (a.subscriber_count || 0) - (b.subscriber_count || 0)
        case 'price_desc': return (b.ad_price || 0) - (a.ad_price || 0)
        case 'price_asc': return (a.ad_price || 0) - (b.ad_price || 0)
        case 'views_desc': return (b.avg_views || 0) - (a.avg_views || 0)
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

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

        {advertiserTab === 'catalog' && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Поиск по названию или username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  border: showFilters
                    ? '1px solid var(--accent-primary, #9333ea)'
                    : '1px solid rgba(255,255,255,0.15)',
                  background: showFilters
                    ? 'color-mix(in srgb, var(--accent-primary, #9333ea) 15%, transparent)'
                    : 'rgba(255,255,255,0.08)',
                  color: showFilters ? 'white' : 'rgba(255,255,255,0.7)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <i className="ti ti-adjustments-horizontal" style={{ fontSize: '14px' }} />
                Фильтры {showFilters ? '▲' : '▼'}
              </button>
              <FilterDropdown
                value={sortBy}
                onChange={setSortBy}
                options={ADVERTISER_SORT_OPTIONS}
                size="sm"
                minWidth={180}
              />
              <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} size="sm" />
            </div>

            {showFilters && (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Страна</span>
                    <FilterDropdown
                      value={selectedCountry}
                      onChange={setSelectedCountry}
                      options={COUNTRY_FILTER_OPTIONS}
                      size="sm"
                      minWidth={200}
                    />
                  </div>

                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Соцсеть</span>
                    <FilterDropdown
                      value={selectedSocialNet}
                      onChange={setSelectedSocialNet}
                      options={SOCIAL_FILTER_OPTIONS}
                      size="sm"
                      minWidth={200}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Подписчики</span>
                      <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                        {minSubs.toLocaleString()} — {maxSubs >= 1000000 ? '1M+' : maxSubs.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="range"
                        min={0}
                        max={1000000}
                        step={1000}
                        value={minSubs}
                        onChange={(e) => setMinSubs(Math.min(Number(e.target.value), maxSubs - 1000))}
                        style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={1000000}
                        step={1000}
                        value={maxSubs}
                        onChange={(e) => setMaxSubs(Math.max(Number(e.target.value), minSubs + 1000))}
                        style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Охваты</span>
                      <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                        {minViews.toLocaleString()} — {maxViews >= 500000 ? '500K+' : maxViews.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="range"
                        min={0}
                        max={500000}
                        step={500}
                        value={minViews}
                        onChange={(e) => setMinViews(Math.min(Number(e.target.value), maxViews - 500))}
                        style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={500000}
                        step={500}
                        value={maxViews}
                        onChange={(e) => setMaxViews(Math.max(Number(e.target.value), minViews + 500))}
                        style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Цена</span>
                      <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                        {getCurrencySymbol(displayCurrency)}{minPrice} — {maxPrice >= 10000 ? '10K+' : getCurrencySymbol(displayCurrency) + maxPrice}
                      </span>
                    </div>
                    <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                      <input
                        type="range"
                        min={0}
                        max={10000}
                        step={10}
                        value={minPrice}
                        onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 10))}
                        style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={10000}
                        step={10}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 10))}
                        style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMinSubs(0)
                      setMaxSubs(1000000)
                      setMinViews(0)
                      setMaxViews(500000)
                      setMinPrice(0)
                      setMaxPrice(10000)
                      setSelectedSocialNet('all')
                      setSelectedCountry('all')
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Сбросить фильтры
                  </button>
                </div>
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
          <input
            placeholder="Поиск по каналу или сообщению..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/30 outline-none focus-accent transition mb-4"
          />
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
        style={{ display: creatorTab === 'campaigns' ? 'none' : 'block' }}
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
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="Поиск по названию, категории или описанию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px 16px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShowCampaignFilters(!showCampaignFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '10px',
                border: showCampaignFilters
                  ? '1px solid var(--accent-primary, #9333ea)'
                  : '1px solid rgba(255,255,255,0.15)',
                background: showCampaignFilters
                  ? 'color-mix(in srgb, var(--accent-primary, #9333ea) 15%, transparent)'
                  : 'rgba(255,255,255,0.08)',
                color: showCampaignFilters ? 'white' : 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <i className="ti ti-adjustments-horizontal" style={{ fontSize: '14px' }} />
              Фильтры {showCampaignFilters ? '▲' : '▼'}
            </button>
            <FilterDropdown
              value={campaignSortBy}
              onChange={setCampaignSortBy}
              options={CAMPAIGN_SORT_OPTIONS}
              size="sm"
              minWidth={180}
            />
            <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} size="sm" />
          </div>

          {showCampaignFilters && (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Страна</span>
                  <FilterDropdown
                    value={filterCountry}
                    onChange={setFilterCountry}
                    options={COUNTRY_FILTER_OPTIONS}
                    size="sm"
                    minWidth={200}
                  />
                </div>

                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Соцсеть</span>
                  <FilterDropdown
                    value={filterSocialNet}
                    onChange={setFilterSocialNet}
                    options={SOCIAL_FILTER_OPTIONS}
                    size="sm"
                    minWidth={200}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Бюджет (AMD)</span>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                      {minBudget.toLocaleString()} — {maxBudget >= 10000000 ? '10M+' : maxBudget.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                    <input type="range" min={0} max={10000000} step={10000} value={minBudget}
                      onChange={(e) => setMinBudget(Math.min(Number(e.target.value), maxBudget - 10000))}
                      style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }} />
                    <input type="range" min={0} max={10000000} step={10000} value={maxBudget}
                      onChange={(e) => setMaxBudget(Math.max(Number(e.target.value), minBudget + 10000))}
                      style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Мин. подписчиков</span>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                      {minRequiredSubs.toLocaleString()} — {maxRequiredSubs >= 1000000 ? '1M+' : maxRequiredSubs.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                    <input type="range" min={0} max={1000000} step={1000} value={minRequiredSubs}
                      onChange={(e) => setMinRequiredSubs(Math.min(Number(e.target.value), maxRequiredSubs - 1000))}
                      style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }} />
                    <input type="range" min={0} max={1000000} step={1000} value={maxRequiredSubs}
                      onChange={(e) => setMaxRequiredSubs(Math.max(Number(e.target.value), minRequiredSubs + 1000))}
                      style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }} />
                  </div>
                </div>

                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Дата размещения</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: 'white',
                        fontSize: '12px',
                        outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>—</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: 'white',
                        fontSize: '12px',
                        outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMinBudget(0)
                    setMaxBudget(10000000)
                    setMinRequiredSubs(0)
                    setMaxRequiredSubs(1000000)
                    setDateFrom('')
                    setDateTo('')
                    setFilterCountry('all')
                    setFilterSocialNet('all')
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Сбросить фильтры
                </button>
              </div>
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
