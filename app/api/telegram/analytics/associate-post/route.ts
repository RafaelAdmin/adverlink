import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { parseTelegramPostUrl, telegramUsernamesMatch } from '@/lib/telegram-post-url'
import { checkRateLimit } from '@/lib/notify-auth'

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { supabase, user } = session

  if (
    !checkRateLimit(rateLimitStore, `associate-post:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  ) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
  }

  let body: { dealId?: string; postUrl?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
  }

  const { dealId, postUrl } = body
  if (!dealId || !postUrl) {
    return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 })
  }

  const parsed = parseTelegramPostUrl(postUrl)
  if (!parsed) {
    return NextResponse.json({ ok: false, error: 'Invalid Telegram post URL' }, { status: 400 })
  }

  if (parsed.username.startsWith('c/')) {
    return NextResponse.json(
      { ok: false, error: 'Private channel post URLs are not supported in V1' },
      { status: 400 },
    )
  }

  const { data: deal } = await supabase
    .from('ad_requests')
    .select('id, channel_id, budget, channels(id, owner_id, telegram_username, platform)')
    .eq('id', dealId)
    .single()

  if (!deal) {
    return NextResponse.json({ ok: false, error: 'Deal not found' }, { status: 404 })
  }

  const channelRaw = deal.channels
  const channel = (Array.isArray(channelRaw) ? channelRaw[0] : channelRaw) as {
    id: string
    owner_id: string
    telegram_username: string
    platform: string | null
  } | null

  if (!channel) {
    return NextResponse.json({ ok: false, error: 'Channel not found' }, { status: 404 })
  }

  if (channel.owner_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  if (channel.platform && channel.platform !== 'telegram') {
    return NextResponse.json({ ok: false, error: 'Not a Telegram channel deal' }, { status: 400 })
  }

  if (!telegramUsernamesMatch(channel.telegram_username, parsed.username)) {
    return NextResponse.json({ ok: false, error: 'Post does not belong to deal channel' }, { status: 400 })
  }

  const { data: postId, error: rpcError } = await supabase.rpc('associate_telegram_post_deal', {
    p_channel_id: channel.id,
    p_message_id: parsed.messageId,
    p_ad_request_id: dealId,
    p_deal_price: deal.budget,
  })

  if (rpcError) {
    console.error('[associate-post] RPC error:', rpcError.message)
    return NextResponse.json({ ok: false, error: 'Association failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    postId,
    messageId: parsed.messageId,
    username: parsed.username,
  })
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 })
}
