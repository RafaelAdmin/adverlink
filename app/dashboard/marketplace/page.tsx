'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'
import { getExchangeRates } from '@/lib/currency'
import { usePreferredCurrency } from '@/lib/usePreferredCurrency'
import AdvertiserView from '../components/marketplace/AdvertiserView'
import CreatorView from '../components/marketplace/CreatorView'
import {
  filterCampaigns,
  filterChannels,
} from '../components/marketplace/filter-logic'
import { sortCampaignsWithProPriority, sortChannelsWithProPriority } from '@/lib/pro-rotation'
import { MY_ORDERS_PATH, shouldRedirectMarketplaceRequestsTab } from '@/lib/my-orders'

export default function DashboardMarketplacePage() {
  return (
    <Suspense fallback={<div className="text-white/50">Загрузка...</div>}>
      <MarketplacePageInner />
    </Suspense>
  )
}

function MarketplacePageInner() {
  const { role } = useDashboard()
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([])
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
  const [channels, setChannels] = useState<any[]>([])
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

  useEffect(() => {
    if (shouldRedirectMarketplaceRequestsTab(searchParams.get('tab'))) {
      router.replace(MY_ORDERS_PATH)
    }
  }, [searchParams, router])

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

      if (role === 'creator') {
        const { data: camps } = await supabase
          .from('marketplace_campaigns')
          .select('*')
        setActiveCampaigns(camps || [])
      } else {
        const { data: ch } = await supabase
          .from('marketplace_channels')
          .select('*')
        setChannels(ch || [])
        const { data: myChannels } = await supabase.from('channels').select('id').eq('owner_id', user.id)
        setMyChannelIds((myChannels || []).map((c) => c.id))
      }
      setLoading(false)
    }
    load()
  }, [role])

  const filteredCampaigns = sortCampaignsWithProPriority(
    filterCampaigns(activeCampaigns, search, minBudget, maxBudget, minRequiredSubs, maxRequiredSubs, dateFrom, dateTo, filterCountry, filterSocialNet, campaignSortBy)
  )
  const filteredChannels = sortChannelsWithProPriority(
    filterChannels(channels, search, minSubs, maxSubs, minViews, maxViews, minPrice, maxPrice, selectedSocialNet, selectedCountry, displayCurrency, rates, sortBy)
  )

  if (role === 'advertiser') {
    return (
      <AdvertiserView
        toast={toast}
        search={search} setSearch={setSearch}
        minSubs={minSubs} setMinSubs={setMinSubs} maxSubs={maxSubs} setMaxSubs={setMaxSubs}
        minViews={minViews} setMinViews={setMinViews} maxViews={maxViews} setMaxViews={setMaxViews}
        minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice}
        selectedSocialNet={selectedSocialNet} setSelectedSocialNet={setSelectedSocialNet}
        selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry}
        displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency}
        sortBy={sortBy} setSortBy={setSortBy} showFilters={showFilters} setShowFilters={setShowFilters}
        loading={loading} filteredChannels={filteredChannels} rates={rates} myChannelIds={myChannelIds}
      />
    )
  }

  return (
    <CreatorView
      toast={toast}
      search={search} setSearch={setSearch} loading={loading}
      showCampaignFilters={showCampaignFilters} setShowCampaignFilters={setShowCampaignFilters}
      campaignSortBy={campaignSortBy} setCampaignSortBy={setCampaignSortBy}
      displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency}
      filterCountry={filterCountry} setFilterCountry={setFilterCountry}
      filterSocialNet={filterSocialNet} setFilterSocialNet={setFilterSocialNet}
      minBudget={minBudget} setMinBudget={setMinBudget} maxBudget={maxBudget} setMaxBudget={setMaxBudget}
      minRequiredSubs={minRequiredSubs} setMinRequiredSubs={setMinRequiredSubs}
      maxRequiredSubs={maxRequiredSubs} setMaxRequiredSubs={setMaxRequiredSubs}
      dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
      filteredCampaigns={filteredCampaigns}
    />
  )
}
