export function filterCreatorRequests(requests: any[], search: string) {
  const q = search.toLowerCase()
  return requests.filter((r) =>
    !q || r.advertiser_name?.toLowerCase().includes(q) ||
    r.advertiser_contact?.toLowerCase().includes(q) ||
    r.message?.toLowerCase().includes(q)
  )
}

export function filterCampaigns(
  campaigns: any[],
  search: string,
  minBudget: number,
  maxBudget: number,
  minRequiredSubs: number,
  maxRequiredSubs: number,
  dateFrom: string,
  dateTo: string,
  filterCountry: string,
  filterSocialNet: string,
  campaignSortBy: string,
) {
  return campaigns
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
      const matchSocial = filterSocialNet === 'all' || (req.platform || 'telegram') === filterSocialNet
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
}

export function filterChannels(
  channels: any[],
  search: string,
  minSubs: number,
  maxSubs: number,
  minViews: number,
  maxViews: number,
  minPrice: number,
  maxPrice: number,
  selectedSocialNet: string,
  selectedCountry: string,
  displayCurrency: string,
  rates: Record<string, number>,
  sortBy: string,
) {
  return channels
    .filter((ch) => {
      const matchSearch = ch.name?.toLowerCase().includes(search.toLowerCase()) ||
        ch.telegram_username?.toLowerCase().includes(search.toLowerCase())
      const matchSubs = (ch.subscriber_count || 0) >= minSubs && (ch.subscriber_count || 0) <= maxSubs
      const matchViews = (ch.avg_views || 0) >= minViews && (ch.avg_views || 0) <= maxViews
      const channelPriceInDisplayCurrency = ch.ad_price
        ? Math.round((ch.ad_price / (rates[ch.ad_price_currency || 'USD'] || 1)) * (rates[displayCurrency] || 1))
        : 0
      const matchPrice = !ch.ad_price || (channelPriceInDisplayCurrency >= minPrice && channelPriceInDisplayCurrency <= maxPrice)
      const matchSocial = selectedSocialNet === 'all' || (ch.platform || 'telegram') === selectedSocialNet
      const matchCountry = selectedCountry === 'all' || (ch.country || '') === selectedCountry
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
}

export function filterSentRequests(requests: any[], channelMap: Record<string, any>, search: string) {
  const q = search.toLowerCase()
  return requests.filter((r) => {
    const ch = channelMap[r.channel_id]
    return !q || ch?.name?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q)
  })
}
