import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import {
  ensureWebhook,
  getBotUsername,
  getChatByUsername,
  isBotChannelAdmin,
} from '@/lib/telegram-bot'
import { checkRateLimit } from '@/lib/notify-auth'
import { createAdminClient } from '@/lib/supabase-admin'

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60_000

function getWebhookUrl(request: NextRequest): string | null {
  const explicit = process.env.TELEGRAM_WEBHOOK_URL
  if (explicit) return explicit
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (!base) return null
  const origin = base.startsWith('http') ? base : `https://${base}`
  return `${origin.replace(/\/$/, '')}/api/telegram/webhook`
}

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { supabase, user } = session

  if (
    !checkRateLimit(rateLimitStore, `analytics-connect:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  ) {
    return NextResponse.json({ connected: false, error: 'Too many requests' }, { status: 429 })
  }

  let body: { channelId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ connected: false, error: 'Invalid body' }, { status: 400 })
  }

  const { channelId } = body
  if (!channelId) {
    return NextResponse.json({ connected: false, error: 'Missing channelId' }, { status: 400 })
  }

  const { data: channel } = await supabase
    .from('channels')
    .select('id, owner_id, telegram_username, verification_status, platform, analytics_status')
    .eq('id', channelId)
    .single()

  if (!channel || channel.owner_id !== user.id) {
    return NextResponse.json({ connected: false, error: 'Forbidden' }, { status: 403 })
  }

  if (channel.verification_status !== 'verified') {
    return NextResponse.json({ connected: false, error: 'Ownership not verified' }, { status: 400 })
  }

  if (channel.platform && channel.platform !== 'telegram') {
    return NextResponse.json({ connected: false, error: 'Not a Telegram channel' }, { status: 400 })
  }

  const chat = await getChatByUsername(channel.telegram_username)
  if (!chat?.id) {
    return NextResponse.json({ connected: false, error: 'Channel not found' }, { status: 404 })
  }

  const isAdmin = await isBotChannelAdmin(chat.id)
  if (!isAdmin) {
    return NextResponse.json({
      connected: false,
      error: 'bot_not_admin',
      botUsername: `@${getBotUsername()}`,
    })
  }

  const { error: rpcError } = await createAdminClient().rpc('connect_telegram_analytics', {
    p_channel_id: channelId,
    p_telegram_chat_id: chat.id,
    p_owner_id: user.id,
  })

  if (rpcError) {
    console.error('[analytics/connect] RPC error:', rpcError.message)
    return NextResponse.json({ connected: false, error: 'Connect failed' }, { status: 500 })
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  const webhookUrl = getWebhookUrl(request)
  if (webhookSecret && webhookUrl) {
    try {
      await ensureWebhook(webhookUrl, webhookSecret)
    } catch (webhookError) {
      console.error('[analytics/connect] setWebhook failed:', webhookError)
    }
  }

  return NextResponse.json({
    connected: true,
    analyticsStatus: 'connected',
    botUsername: `@${getBotUsername()}`,
  })
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 })
}
