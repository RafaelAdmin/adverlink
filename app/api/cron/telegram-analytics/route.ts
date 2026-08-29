import { NextResponse } from 'next/server'
import { validateCronRequest } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { processDueSnapshots, recalculateChannelMetrics, refreshChannelSubscribers } from '@/lib/telegram-analytics-sync'

const BATCH_SIZE = 30
const CHANNEL_BATCH = 20

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

    return NextResponse.json({
      success: true,
      snapshots,
      channels: { refreshed: channelsRefreshed, failed: channelsFailed },
    })
  } catch (error) {
    console.error('[cron/telegram-analytics] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
