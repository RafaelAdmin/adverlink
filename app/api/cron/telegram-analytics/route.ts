import { NextResponse } from 'next/server'
import { validateCronRequest } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { processDueSnapshots, recalculateChannelMetrics, refreshChannelSubscribers, refreshVerifiedChannelSubscribersByUsername } from '@/lib/telegram-analytics-sync'

const BATCH_SIZE = 30
const CHANNEL_BATCH = 20
const BASIC_CHANNEL_BATCH = 20

export async function GET(request: Request) {
  const authResult = validateCronRequest(
    request.headers.get('authorization'),
    process.env.CRON_SECRET,
  )

  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let snapshots = { checked: 0, updated: 0, failed: 0 }
  let channelsRefreshed = 0
  let channelsFailed = 0
  let basicRefreshed = 0
  let basicFailed = 0

  try {
    const supabase = createAdminClient()

    snapshots = await processDueSnapshots(supabase, BATCH_SIZE)

    const { data: channels } = await supabase
      .from('channels')
      .select('id, telegram_chat_id')
      .in('analytics_status', ['connected', 'collecting', 'active'])
      .not('telegram_chat_id', 'is', null)
      .limit(CHANNEL_BATCH)

    for (const channel of channels || []) {
      try {
        if (channel.telegram_chat_id) {
          await refreshChannelSubscribers(supabase, channel.id, channel.telegram_chat_id)
          await recalculateChannelMetrics(supabase, channel.id)
          channelsRefreshed += 1
        }
      } catch {
        channelsFailed += 1
      }
    }

    const { data: verifiedBasic } = await supabase
      .from('channels')
      .select('id, telegram_username')
      .eq('verification_status', 'verified')
      .or('platform.eq.telegram,platform.is.null')
      .or('analytics_status.is.null,analytics_status.eq.disconnected,analytics_status.eq.error')
      .limit(BASIC_CHANNEL_BATCH)

    for (const channel of verifiedBasic || []) {
      try {
        await refreshVerifiedChannelSubscribersByUsername(
          supabase,
          channel.id,
          channel.telegram_username,
        )
        basicRefreshed += 1
      } catch {
        basicFailed += 1
      }
    }

    return NextResponse.json({
      success: true,
      snapshots,
      channels: { refreshed: channelsRefreshed, failed: channelsFailed },
      basicSubscribers: { refreshed: basicRefreshed, failed: basicFailed },
    })
  } catch (error) {
    console.error('[cron/telegram-analytics] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
