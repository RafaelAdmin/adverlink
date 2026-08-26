import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { verifyCodeInDescription } from '@/lib/verification-check'

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ verified: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { channelId?: string; code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ verified: false, error: 'Invalid body' }, { status: 400 })
  }

  const { channelId, code } = body
  if (!channelId || !code) {
    return NextResponse.json({ verified: false, error: 'Missing params' }, { status: 400 })
  }

  const { supabase, user } = session
  const { data: channel } = await supabase
    .from('channels')
    .select('id, owner_id, telegram_username, verification_code')
    .eq('id', channelId)
    .single()

  if (!channel || channel.owner_id !== user.id) {
    return NextResponse.json({ verified: false, error: 'Forbidden' }, { status: 403 })
  }

  if (!channel.verification_code) {
    return NextResponse.json({ verified: false, error: 'Verification code not issued' }, { status: 400 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ verified: false, error: 'Bot token not configured' }, { status: 500 })
  }

  const username = channel.telegram_username?.replace('@', '').replace(/[^a-zA-Z0-9_]/g, '') || ''
  if (!username) {
    return NextResponse.json({ verified: false, error: 'Channel username missing' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getChat?chat_id=@${username}`,
    )
    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ verified: false, error: 'Channel not found' })
    }

    const description = data.result?.description || ''
    const verified = verifyCodeInDescription(code, channel.verification_code, description)

    if (verified) {
      const { error: updateError } = await supabase.rpc('verify_channel_after_check', {
        p_channel_id: channelId,
      })

      if (updateError) {
        console.error('Telegram verify RPC error:', updateError.message)
        return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ verified })
  } catch {
    return NextResponse.json({ verified: false, error: 'API error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(
    { verified: false, error: 'Use POST with authentication' },
    { status: 405 },
  )
}
