import type { SupabaseClient } from '@supabase/supabase-js'
import { extractMessageViews, getChatMemberCount, type TelegramMessage } from '@/lib/telegram-bot'
import {
  aggregatePostViews,
  ANALYTICS_MIN_POSTS,
  computeErr,
  getAnalyticsCollectionState,
} from '@/lib/telegram-analytics'
import { getScheduledSnapshots } from '@/lib/telegram-snapshot-schedule'
import {
  acceptMonotonicViewUpdate,
  fetchChannelPreview,
  fetchPostPreviewFallback,
  isSnapshotRetryExpired,
  normalizePublicUsername,
  parseChannelPreviewHtml,
} from '@/lib/telegram-web-preview'

export type DueSnapshotRow = {
  snapshotId: string
  postId: string
  checkpoint: string
  scheduledAt: string
  messageId: number
  currentViews: number | null
  channelId: string
  telegramChatId: number
  telegramUsername: string
}

export type ProcessDueSnapshotsResult = {
  checked: number
  updated: number
  failed: number
  previewChannelsFetched: number
  previewFetchFailed: number
  viewsResolved: number
  viewsUnavailable: number
  leftPending: number
}

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
      .select('id, current_views')
      .eq('channel_id', channelId)
      .eq('telegram_message_id', messageId)
      .maybeSingle()

    if (existing?.id) {
      const nextViews =
        views !== null && acceptMonotonicViewUpdate(existing.current_views, views)
          ? views
          : existing.current_views
      await supabase
        .from('telegram_posts')
        .update({
          edited_at: message.edit_date ? new Date(message.edit_date * 1000).toISOString() : now,
          current_views: nextViews,
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
    status: 'pending' as const,
    views_unavailable: false,
  }))

  await supabase.from('telegram_post_snapshots').upsert(snapshots, {
    onConflict: 'post_id,checkpoint',
    ignoreDuplicates: true,
  })

  if (snapshots.some((s) => s.checkpoint === 'publication')) {
    await captureSnapshot(supabase, post.id, 'publication', subscriberCount, views, null)
  }

  return { ok: true, postId: post.id }
}

export async function captureSnapshot(
  supabase: SupabaseClient,
  postId: string,
  checkpoint: string,
  subscriberCount: number | null,
  views: number | null,
  currentViewsForMonotonic: number | null | undefined,
): Promise<void> {
  const viewsUnavailable = views === null
  const now = new Date().toISOString()

  await supabase
    .from('telegram_post_snapshots')
    .update({
      status: 'captured',
      captured_at: now,
      subscriber_count: subscriberCount,
      views: viewsUnavailable ? null : views,
      views_unavailable: viewsUnavailable,
    })
    .eq('post_id', postId)
    .eq('checkpoint', checkpoint)
    .eq('status', 'pending')

  const postUpdate: { last_analytics_update: string; current_views?: number } = {
    last_analytics_update: now,
  }

  if (!viewsUnavailable && views !== null && acceptMonotonicViewUpdate(currentViewsForMonotonic, views)) {
    postUpdate.current_views = views
  }

  await supabase.from('telegram_posts').update(postUpdate).eq('id', postId)
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

async function loadDueSnapshotRows(
  supabase: SupabaseClient,
  batchSize: number,
): Promise<DueSnapshotRow[]> {
  const now = new Date().toISOString()
  const { data: due } = await supabase
    .from('telegram_post_snapshots')
    .select('id, post_id, checkpoint, scheduled_at')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(batchSize)

  if (!due?.length) return []

  const postIds = [...new Set(due.map((row) => row.post_id))]
  const { data: posts } = await supabase
    .from('telegram_posts')
    .select('id, channel_id, telegram_chat_id, telegram_message_id, current_views, channels(telegram_username)')
    .in('id', postIds)

  const postById = new Map(
    (posts || []).map((post) => {
      const channelRaw = post.channels as { telegram_username?: string } | { telegram_username?: string }[] | null
      const channel = Array.isArray(channelRaw) ? channelRaw[0] : channelRaw
      return [
        post.id,
        {
          channelId: post.channel_id as string,
          telegramChatId: post.telegram_chat_id as number,
          telegramUsername: channel?.telegram_username ?? null,
          messageId: post.telegram_message_id as number,
          currentViews: post.current_views as number | null,
        },
      ]
    }),
  )

  const rows: DueSnapshotRow[] = []
  for (const snap of due) {
    const post = postById.get(snap.post_id)
    if (!post?.telegramUsername) continue
    const normalized = normalizePublicUsername(post.telegramUsername)
    if (!normalized) continue

    rows.push({
      snapshotId: snap.id,
      postId: snap.post_id,
      checkpoint: snap.checkpoint,
      scheduledAt: snap.scheduled_at,
      messageId: post.messageId,
      currentViews: post.currentViews,
      channelId: post.channelId,
      telegramChatId: post.telegramChatId,
      telegramUsername: normalized,
    })
  }

  return rows
}

function groupDueSnapshotsByUsername(rows: DueSnapshotRow[]): Map<string, DueSnapshotRow[]> {
  const groups = new Map<string, DueSnapshotRow[]>()
  for (const row of rows) {
    const key = row.telegramUsername.toLowerCase()
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  return groups
}

async function resolveViewsForSnapshot(
  row: DueSnapshotRow,
  channelPreviewHtml: string | null,
  channelFetchFailed: boolean,
): Promise<number | null> {
  if (channelPreviewHtml) {
    const fromChannel = parseChannelPreviewHtml(channelPreviewHtml, row.telegramUsername).get(row.messageId)
    if (fromChannel !== undefined) return fromChannel
  }

  if (channelFetchFailed) return null

  const fallback = await fetchPostPreviewFallback(row.telegramUsername, row.messageId)
  if (!fallback.ok || !fallback.html) return null

  return parseChannelPreviewHtml(fallback.html, row.telegramUsername).get(row.messageId) ?? null
}

export async function processDueSnapshots(
  supabase: SupabaseClient,
  batchSize: number,
): Promise<ProcessDueSnapshotsResult> {
  const result: ProcessDueSnapshotsResult = {
    checked: 0,
    updated: 0,
    failed: 0,
    previewChannelsFetched: 0,
    previewFetchFailed: 0,
    viewsResolved: 0,
    viewsUnavailable: 0,
    leftPending: 0,
  }

  const now = new Date()
  const dueRows = await loadDueSnapshotRows(supabase, batchSize)
  result.checked = dueRows.length

  if (!dueRows.length) return result

  const touchedChannels = new Set<string>()
  const groups = groupDueSnapshotsByUsername(dueRows)

  for (const [, snapshots] of groups) {
    const username = snapshots[0].telegramUsername

    try {
      const preview = await fetchChannelPreview(username)
      const channelFetchFailed = !preview.ok || !preview.html

      if (channelFetchFailed) {
        result.previewFetchFailed += 1
      } else {
        result.previewChannelsFetched += 1
      }

      const channelHtml = channelFetchFailed ? null : preview.html

      for (const row of snapshots) {
        try {
          const subscriberCount = await getChatMemberCount(row.telegramChatId)
          let parsedViews: number | null = null

          if (!channelFetchFailed || !isSnapshotRetryExpired(row.checkpoint, row.scheduledAt, now)) {
            parsedViews = await resolveViewsForSnapshot(row, channelHtml, channelFetchFailed)
          }

          if (parsedViews !== null) {
            await captureSnapshot(
              supabase,
              row.postId,
              row.checkpoint,
              subscriberCount,
              parsedViews,
              row.currentViews,
            )
            result.updated += 1
            result.viewsResolved += 1
            touchedChannels.add(row.channelId)
            continue
          }

          if (isSnapshotRetryExpired(row.checkpoint, row.scheduledAt, now)) {
            await captureSnapshot(
              supabase,
              row.postId,
              row.checkpoint,
              subscriberCount,
              null,
              row.currentViews,
            )
            result.updated += 1
            result.viewsUnavailable += 1
            touchedChannels.add(row.channelId)
          } else {
            result.leftPending += 1
          }
        } catch {
          result.failed += 1
        }
      }
    } catch {
      result.previewFetchFailed += 1
      result.failed += snapshots.length
    }
  }

  for (const channelId of touchedChannels) {
    await recalculateChannelMetrics(supabase, channelId)
  }

  return result
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

export async function refreshVerifiedChannelSubscribersByUsername(
  supabase: SupabaseClient,
  channelId: string,
  telegramUsername: string,
): Promise<number | null> {
  const clean = telegramUsername.replace('@', '').replace(/[^a-zA-Z0-9_]/g, '')
  if (!clean) return null
  return refreshChannelSubscribers(supabase, channelId, `@${clean}`)
}

export { ANALYTICS_MIN_POSTS, acceptMonotonicViewUpdate }
