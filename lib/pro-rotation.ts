export function getDailyRotationScore(id: string): number {
  const today = new Date()
  const dateKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  let hash = 0
  const str = dateKey + id
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const x = Math.sin(Math.abs(hash)) * 10000
  return x - Math.floor(x)
}

export function sortChannelsWithProPriority(channels: any[]): any[] {
  return [...channels].sort((a, b) => {
    const aIsPro = a.owner_profile?.subscription_plan === 'pro' || a.owner_profile?.is_admin === true
    const bIsPro = b.owner_profile?.subscription_plan === 'pro' || b.owner_profile?.is_admin === true
    const aIsVerified = a.is_verified === true
    const bIsVerified = b.is_verified === true

    if (aIsPro && bIsPro) {
      return getDailyRotationScore(a.id) - getDailyRotationScore(b.id)
    }
    if (aIsPro && !bIsPro) return -1
    if (!aIsPro && bIsPro) return 1
    if (aIsVerified && !bIsVerified) return -1
    if (!aIsVerified && bIsVerified) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function sortCampaignsWithProPriority(campaigns: any[]): any[] {
  return [...campaigns].sort((a, b) => {
    const aIsPro = a.advertiser_profile?.subscription_plan === 'pro' || a.advertiser_profile?.is_admin === true
    const bIsPro = b.advertiser_profile?.subscription_plan === 'pro' || b.advertiser_profile?.is_admin === true

    if (aIsPro && bIsPro) {
      return getDailyRotationScore(a.id) - getDailyRotationScore(b.id)
    }
    if (aIsPro && !bIsPro) return -1
    if (!aIsPro && bIsPro) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}
