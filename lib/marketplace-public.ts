export const MARKETPLACE_CHANNELS_VIEW = 'marketplace_channels'
export const MARKETPLACE_CAMPAIGNS_VIEW = 'marketplace_campaigns'

/** Columns that must never appear on the public channel view or in anon table SELECT. */
export const CHANNEL_SECRET_COLUMNS = [
  'verification_code',
  'telegram_chat_id',
  'external_account_id',
  'verification_expires_at',
] as const

/** Columns that must never appear on the public campaign view or in anon table SELECT. */
export const CAMPAIGN_SECRET_COLUMNS = ['advertiser_email'] as const

type QueryClient = {
  from: (relation: string) => any
}

export async function fetchOwnedChannel(
  supabase: QueryClient,
  channelId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .eq('owner_id', userId)
    .maybeSingle()
  return data
}

export async function fetchMarketplaceChannel(supabase: QueryClient, channelId: string) {
  const { data } = await supabase
    .from(MARKETPLACE_CHANNELS_VIEW)
    .select('*')
    .eq('id', channelId)
    .maybeSingle()
  return data
}

export async function fetchOwnedOrMarketplaceChannel(
  supabase: QueryClient,
  channelId: string,
  userId: string,
) {
  const owned = await fetchOwnedChannel(supabase, channelId, userId)
  if (owned) return { channel: owned, isOwner: true }
  const listed = await fetchMarketplaceChannel(supabase, channelId)
  return { channel: listed, isOwner: false }
}

export async function fetchOwnedCampaign(
  supabase: QueryClient,
  campaignId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('campaigns')
    .select(
      `
      *,
      advertiser_profile:profiles!advertiser_id(full_name, avatar_url, subscription_plan, is_admin)
    `,
    )
    .eq('id', campaignId)
    .eq('advertiser_id', userId)
    .maybeSingle()
  return data
}

export async function fetchMarketplaceCampaign(supabase: QueryClient, campaignId: string) {
  const { data } = await supabase
    .from(MARKETPLACE_CAMPAIGNS_VIEW)
    .select('*')
    .eq('id', campaignId)
    .maybeSingle()
  return data
}

export async function fetchOwnedOrMarketplaceCampaign(
  supabase: QueryClient,
  campaignId: string,
  userId: string,
) {
  const owned = await fetchOwnedCampaign(supabase, campaignId, userId)
  if (owned) return { campaign: owned, isOwner: true }
  const listed = await fetchMarketplaceCampaign(supabase, campaignId)
  return { campaign: listed, isOwner: false }
}

export function publicCampaignAdvertiserContact(campaign: {
  advertiser_profile?: { full_name?: string | null } | null
  name?: string | null
}) {
  return {
    advertiser_contact:
      campaign.advertiser_profile?.full_name || campaign.name || 'Advertiser',
    advertiser_email: null,
  }
}
