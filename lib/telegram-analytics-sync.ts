import type { SupabaseClient } from '@supabase/supabase-js'
import { extractMessageViews, getChatMemberCount, type TelegramMessage } from '@/lib/telegram-bot'
import {
  aggregatePostViews,
  ANALYTICS_MIN_POSTS,
  computeErr,
  getAnalyticsCollectionState,
} from '@/lib/telegram-analytics'
import { getScheduledSnapshots } from '@/lib/telegram-snapshot-schedule'

export async function ingestChannelPost(
  supabase: SupabaseClient,
  channelId: string,
  message: TelegramMessage,
  isEdit = false,
): Promise<{ ok: true; postId: string } | { ok: false; reason: string }> {
  const chatId = message.chat.id
  const messageId = message.message_id
  const publishedAt = new Date(message.date * 1000)
  const views = extractMessageViews(message)
  const subscriberCount = await getChatMemberCount(chatId)
  const now = new Date().toISOString()

  if (isEdit) {
    const { data: existing } = await supabase
      .from('telegram_posts')
      .select('id')
      .eq('channel_id', channelId)
      .eq('telegram_message_id', messageId)
      .maybeSingle()

    if (existing?.id) {
      await supabase
        .from('telegram_posts')
        .update({
          edited_at: message.edit_date ? new Date(message.edit_date * 1000).toISOString() : now,
          current_views: views,
          last_analytics_update: now,
        })
        .eq('id', existing.id)
      return { ok: true, postId: existing.id }
    }
  }

  const { data: post, error: postError } = await supabase
    .from('telegram_posts')
    .upsert(
      {
        channel_id: channelId,
        telegram_chat_id: chatId,
        telegram_message_id: messageId,
        published_at: publishedAt.toISOString(),
        subscriber_count_at_publish: subscriberCount,
        views_at_ingest: views,
        current_views: views,
        last_analytics_update: now,
        edited_at: isEdit && message.edit_date ? new Date(message.edit_date * 1000).toISOString() : null,
      },
      { onConflict: 'channel_id,telegram_message_id' },
    )
    .select('id')
    .single()

  if (postError || !post) {
    return { ok: false, reason: postError?.message || 'insert failed' }
  }

  const snapshots = getScheduledSnapshots(publishedAt).map((s) => ({
    post_id: post.id,
    checkpoint: s.checkpoint,
    scheduled_at: s.scheduledAt.toISOString(),
    status: s.checkpoint === 'publication' ? 'pending' : 'pending',
    views_unavailable: false,
  }))

  await supabase.from('telegram_post_snapshots').upsert(snapshots, {
    onConflict: 'post_id,checkpoint',
    ignoreDuplicates: true,
  })

  if (snapshots.some((s) => s.checkpoint === 'publication')) {
    await captureSnapshot(supabase, post.id, 'publication', subscriberCount, views)
  }

  return { ok: true, postId: post.id }
}

export async function captureSnapshot(
  supabase: SupabaseClient,
  postId: string,
  checkpoint: string,
  subscriberCount: number | null,
  views: number | null,
): Promise<void> {
  const viewsUnavailable = views === null
  await supabase
    .from('telegram_post_snapshots')
    .update({
      status: 'captured',
      captured_at: new Date().toISOString(),
      subscriber_count: subscriberCount,
      views: viewsUnavailable ? null : views,
      views_unavailable: viewsUnavailable,
    })
    .eq('post_id', postId)
    .eq('checkpoint', checkpoint)
    .eq('status', 'pending')
}

export async function recalculateChannelMetrics(
  supabase: SupabaseClient,
  channelId: string,
): Promise<void> {
  const { data: channel } = await supabase
    .from('channels')
    .select('id, subscriber_count, analytics_status, analytics_posts_tracked')
    .eq('id', channelId)
    .single()

  if (!channel) return

  const { count: postsTracked } = await supabase
    .from('telegram_posts')
    .select('id', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .eq('is_deleted', false)

  const { data: posts } = await supabase
    .from('telegram_posts')
    .select('id, views_at_ingest, current_views')
    .eq('channel_id', channelId)
    .eq('is_deleted', false)
    .order('published_at', { ascending: false })
    .limit(20)

  const postIds = (posts || []).map((p) => p.id)
  let snapshots24h: { post_id: string; views: number | null }[] = []

  if (postIds.length > 0) {
    const { data: snaps } = await supabase
      .from('telegram_post_snapshots')
      .select('post_id, views, views_unavailable')
      .in('post_id', postIds)
      .eq('checkpoint', '24h')
      .eq('status', 'captured')
      .eq('views_unavailable', false)

    snapshots24h = snaps || []
  }

  const views24ByPost = new Map(snapshots24h.map((s) => [s.post_id, s.views]))

  const aggregated = aggregatePostViews(
    (posts || []).map((p) => ({
      views: p.current_views ?? p.views_at_ingest,
      views24h: views24ByPost.get(p.id) ?? null,
    })),
  )

  const postsTrackedCount = postsTracked ?? 0
  const subs = channel.subscriber_count ?? 0
  const hasViewMetrics = (aggregated.avgViews ?? 0) > 0
  const collectionState = getAnalyticsCollectionState({
    analyticsStatus: channel.analytics_status,
    postsTracked: postsTrackedCount,
    hasViewMetrics,
  })

  let analyticsStatus = channel.analytics_status
  if (channel.analytics_status === 'connected' || channel.analytics_status === 'collecting') {
    analyticsStatus =
      collectionState.status === 'active' ? 'active' : postsTrackedCount > 0 ? 'collecting' : 'connected'
  }

  const engagementRate =
    aggregated.avgViews !== null && subs > 0 ? computeErr(subs, aggregated.avgViews) : null

  await supabase.rpc('sync_channel_analytics_metrics', {
    p_channel_id: channelId,
    p_subscriber_count: subs,
    p_avg_views: aggregated.avgViews,
    p_engagement_rate: engagementRate,
    p_analytics_status: analyticsStatus,
    p_posts_tracked: postsTrackedCount,
    p_avg_views_24h: aggregated.avgViews24h,
    p_err24_eligible_count: aggregated.eligible24hCount,
  })
}

export async function processDueSnapshots(
  supabase: SupabaseClient,
  batchSize: number,
): Promise<{ checked: number; updated: number; failed: number }> {
  const now = new Date().toISOString()
  const { data: due } = await supabase
    .from('telegram_post_snapshots')
    .select('id, post_id, checkpoint')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(batchSize)

  let updated = 0
  let failed = 0
  const touchedChannels = new Set<string>()

  for (const row of due || []) {
    try {
      const { data: post } = await supabase
        .from('telegram_posts')
        .select('channel_id, telegram_chat_id')
        .eq('id', row.post_id)
        .single()

      if (!post) {
        failed += 1
        continue
      }

      const subscriberCount = await getChatMemberCount(post.telegram_chat_id)
      // Bot API cannot refresh post views — always null after publication checkpoint
      await captureSnapshot(supabase, row.post_id, row.checkpoint, subscriberCount, null)
      updated += 1
      touchedChannels.add(post.channel_id)
    } catch {
      failed += 1
      await supabase
        .from('telegram_post_snapshots')
        .update({ status: 'failed' })
        .eq('id', row.id)
    }
  }

  for (const channelId of touchedChannels) {
    await recalculateChannelMetrics(supabase, channelId)
  }

  return { checked: due?.length ?? 0, updated, failed }
}

export async function refreshChannelSubscribers(
  supabase: SupabaseClient,
  channelId: string,
  chatId: number | string,
): Promise<number | null> {
  const count = await getChatMemberCount(chatId)
  if (count === null) return null

  await supabase.rpc('sync_channel_analytics_metrics', {
    p_channel_id: channelId,
    p_subscriber_count: count,
    p_avg_views: null,
    p_engagement_rate: null,
    p_analytics_status: null,
    p_posts_tracked: null,
    p_avg_views_24h: null,
    p_err24_eligible_count: null,
  })

  return count
}

export { ANALYTICS_MIN_POSTS }
