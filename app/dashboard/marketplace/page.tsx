'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'
import { CurrencyCode, getExchangeRates } from '@/lib/currency'
import { usePreferredCurrency } from '@/lib/usePreferredCurrency'
import AdvertiserView from '../components/marketplace/AdvertiserView'
import CreatorView from '../components/marketplace/CreatorView'
import {
  filterCreatorRequests,
  filterCampaigns,
  filterChannels,
  filterSentRequests,
} from '../components/marketplace/filter-logic'
import { sortCampaignsWithProPriority, sortChannelsWithProPriority } from '@/lib/pro-rotation'

export default function DashboardMarketplacePage() {
  const { role } = useDashboard()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState('')
  const [creatorTab, setCreatorTab] = useState<'mine' | 'campaigns'>('campaigns')
  const [myAdRequests, setMyAdRequests] = useState<any[]>([])
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([])
  const [userChannels, setUserChannels] = useState<any[]>([])
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
  const [displayCurrency, setDisplayCurrency] = usePreferredCurrency()
  const [rates, setRates] = useState<Record<string, number>>({})

  const creatorChannelMap = Object.fromEntries(userChannels.map((c) => [c.id, c]))
  const showToast = () => setToast('✓ Статус обновлён')

  useEffect(() => { getExchangeRates().then(setRates).catch(() => {}) }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

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
          const { data: mine } = await supabase.from('ad_requests').select('*, channels(name, avatar_url)').in('channel_id', channelIds).order('created_at', { ascending: false })
          setMyAdRequests(mine || [])
        } else setMyAdRequests([])
        const { data: camps } = await supabase
          .from('campaigns')
          .select(`
            *,
            advertiser_profile:profiles!advertiser_id(full_name, avatar_url, subscription_plan, is_admin)
          `)
          .in('status', ['active', 'collecting', 'in_progress'])
        setActiveCampaigns(camps || [])
      } else {
        const { data: ch } = await supabase
          .from('channels')
          .select(`
            *,
            owner_profile:profiles!owner_id(subscription_plan, is_admin)
          `)
          .eq('is_active', true)
        setChannels(ch || [])
        const map: Record<string, any> = {}
        ;(ch || []).forEach((c) => { map[c.id] = c })
        setChannelMap(map)
        const { data: myChannels } = await supabase.from('channels').select('id').eq('owner_id', user.id)
        setMyChannelIds((myChannels || []).map((c) => c.id))
        const { data: sent } = await supabase.from('ad_requests').select('*').eq('advertiser_id', user.id).order('created_at', { ascending: false })
        setSentRequests(sent || [])
      }
      setLoading(false)
    }
    load()
  }, [role])

  const updateRequest = (id: string, patch: Record<string, unknown>) => {
    const setter = role === 'creator' ? setMyAdRequests : setSentRequests
    setter((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const filteredCreatorRequests = filterCreatorRequests(myAdRequests, search)
  const filteredCampaigns = sortCampaignsWithProPriority(
    filterCampaigns(activeCampaigns, search, minBudget, maxBudget, minRequiredSubs, maxRequiredSubs, dateFrom, dateTo, filterCountry, filterSocialNet, campaignSortBy)
  )
  const filteredChannels = sortChannelsWithProPriority(
    filterChannels(channels, search, minSubs, maxSubs, minViews, maxViews, minPrice, maxPrice, selectedSocialNet, selectedCountry, displayCurrency, rates, sortBy)
  )
  const filteredSentRequests = filterSentRequests(sentRequests, channelMap, search)

  if (role === 'advertiser') {
    return (
      <AdvertiserView
        toast={toast} advertiserTab={advertiserTab} setAdvertiserTab={setAdvertiserTab}
        search={search} setSearch={setSearch}
        minSubs={minSubs} setMinSubs={setMinSubs} maxSubs={maxSubs} setMaxSubs={setMaxSubs}
        minViews={minViews} setMinViews={setMinViews} maxViews={maxViews} setMaxViews={setMaxViews}
        minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice}
        selectedSocialNet={selectedSocialNet} setSelectedSocialNet={setSelectedSocialNet}
        selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry}
        displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency}
        sortBy={sortBy} setSortBy={setSortBy} showFilters={showFilters} setShowFilters={setShowFilters}
        loading={loading} filteredChannels={filteredChannels} rates={rates} myChannelIds={myChannelIds}
        filteredSentRequests={filteredSentRequests} channelMap={channelMap} userId={userId}
        onUpdateRequest={updateRequest} showToast={showToast}
      />
    )
  }

  return (
    <CreatorView
      toast={toast} creatorTab={creatorTab} setCreatorTab={setCreatorTab}
      search={search} setSearch={setSearch} loading={loading}
      filteredCreatorRequests={filteredCreatorRequests} creatorChannelMap={creatorChannelMap}
      userId={userId} onUpdateRequest={updateRequest} showToast={showToast}
      showCampaignFilters={showCampaignFilters} setShowCampaignFilters={setShowCampaignFilters}
      campaignSortBy={campaignSortBy} setCampaignSortBy={setCampaignSortBy}
      displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency}
      filterCountry={filterCountry} setFilterCountry={setFilterCountry}
      filterSocialNet={filterSocialNet} setFilterSocialNet={setFilterSocialNet}
      minBudget={minBudget} setMinBudget={setMinBudget} maxBudget={maxBudget} setMaxBudget={setMaxBudget}
      minRequiredSubs={minRequiredSubs} setMinRequiredSubs={setMinRequiredSubs}
      maxRequiredSubs={maxRequiredSubs} setMaxRequiredSubs={setMaxRequiredSubs}
      dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
      filteredCampaigns={filteredCampaigns} userChannels={userChannels}
    />
  )
}
