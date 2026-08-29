import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import type { TelegramUpdate } from '@/lib/telegram-bot'
import { ingestChannelPost } from '@/lib/telegram-analytics-sync'

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  const headerSecret = request.headers.get('x-telegram-bot-api-secret-token')
  if (headerSecret !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const message = update.channel_post || update.edited_channel_post
  if (!message?.chat?.id) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    const supabase = createAdminClient()
    const chatId = message.chat.id

    const { data: channel } = await supabase
      .from('channels')
      .select('id, analytics_status')
      .eq('telegram_chat_id', chatId)
      .in('analytics_status', ['connected', 'collecting', 'active'])
      .maybeSingle()

    if (!channel) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const result = await ingestChannelPost(
      supabase,
      channel.id,
      message,
      Boolean(update.edited_channel_post),
    )

    if (!result.ok) {
      console.error('[telegram/webhook] ingest failed:', result.reason)
      return NextResponse.json({ ok: true, ingested: false })
    }

    return NextResponse.json({ ok: true, ingested: true })
  } catch (error) {
    console.error('[telegram/webhook] error:', error)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'telegram-webhook' })
}
