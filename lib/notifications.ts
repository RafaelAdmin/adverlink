import type { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

const EPOCH = '1970-01-01T00:00:00.000Z'

export function notifyNotificationsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('adverlink-notifications-changed'))
  }
}

function isUnviewed(viewedAt: string | null | undefined, activityAt: string | null | undefined) {
  if (!viewedAt) return true
  const activity = activityAt || EPOCH
  return activity > viewedAt
}

async function getUserDealIds(supabase: SupabaseClient, userId: string) {
  const ids = new Set<string>()

  const { data: channels } = await supabase.from('channels').select('id').eq('owner_id', userId)
  const channelIds = (channels || []).map((c) => c.id)

  if (channelIds.length > 0) {
    const { data: creatorDeals } = await supabase.from('ad_requests').select('id').in('channel_id', channelIds)
    ;(creatorDeals || []).forEach((d) => ids.add(d.id))
  }

  const { data: advertiserDeals } = await supabase.from('ad_requests').select('id').eq('advertiser_id', userId)
  ;(advertiserDeals || []).forEach((d) => ids.add(d.id))

  return [...ids]
}

export async function fetchNotificationFlags(supabase: SupabaseClient, userId: string) {
  let hasUnreadMessages = false
  let hasCreatorRequests = false
  let hasAdvertiserRequests = false

  try {
    const dealIds = await getUserDealIds(supabase, userId)

    if (dealIds.length > 0) {
      const { data: reads } = await supabase
        .from('deal_chat_reads')
        .select('deal_id, last_read_at')
        .eq('user_id', userId)
        .in('deal_id', dealIds)

      const readMap = new Map((reads || []).map((r) => [r.deal_id, r.last_read_at]))

      const { data: msgs } = await supabase
        .from('messages')
        .select('deal_id, created_at')
        .in('deal_id', dealIds)
        .neq('sender_id', userId)

      hasUnreadMessages = (msgs || []).some((m) => {
        const lastRead = readMap.get(m.deal_id) || EPOCH
        return m.created_at > lastRead
      })
    }
  } catch {
    hasUnreadMessages = false
  }

  const { data: channels } = await supabase.from('channels').select('id').eq('owner_id', userId)
  const channelIds = (channels || []).map((c) => c.id)

  if (channelIds.length > 0) {
    const { data: creatorReqs } = await supabase
      .from('ad_requests')
      .select('status, creator_viewed_at, updated_at, created_at')
      .in('channel_id', channelIds)
      .in('status', ['new', 'payment_pending'])

    hasCreatorRequests = (creatorReqs || []).some((r) =>
      isUnviewed(r.creator_viewed_at, r.updated_at || r.created_at),
    )
  }

  const { data: advReqs } = await supabase
    .from('ad_requests')
    .select('status, advertiser_viewed_at, updated_at, created_at, campaign_id')
    .eq('advertiser_id', userId)

  hasAdvertiserRequests = (advReqs || []).some((r) => {
    const needsReview = r.status === 'submitted'
    const newApplication = r.status === 'new' && r.campaign_id
    if (!needsReview && !newApplication) return false
    return isUnviewed(r.advertiser_viewed_at, r.updated_at || r.created_at)
  })

  return { hasUnreadMessages, hasCreatorRequests, hasAdvertiserRequests }
}

export async function markChatRead(supabase: SupabaseClient, dealId: string, userId: string) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('deal_chat_reads').upsert(
    { user_id: userId, deal_id: dealId, last_read_at: now },
    { onConflict: 'user_id,deal_id' },
  )
  if (!error) notifyNotificationsChanged()
}

export async function markDealViewed(
  supabase: SupabaseClient,
  dealId: string,
  as: 'creator' | 'advertiser',
) {
  const field = as === 'creator' ? 'creator_viewed_at' : 'advertiser_viewed_at'
  const { error } = await supabase
    .from('ad_requests')
    .update({ [field]: new Date().toISOString() })
    .eq('id', dealId)
  if (!error) notifyNotificationsChanged()
}
