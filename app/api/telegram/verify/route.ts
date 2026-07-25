import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

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

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ verified: false, error: 'Bot token not configured' }, { status: 500 })
  }

  const username = channel.telegram_username?.replace('@', '') || ''
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
    const verified = description.includes(code)

    if (verified) {
      const { error: updateError } = await supabase.rpc('verify_channel_after_check', {
        p_channel_id: channelId,
      })

      if (updateError) {
        return NextResponse.json({ verified: false, error: updateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      verified,
      description: description.substring(0, 100),
    })
  } catch {
    return NextResponse.json({ verified: false, error: 'API error' }, { status: 500 })
  }
}

// Legacy GET kept for backwards compatibility — no DB update
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  const code = request.nextUrl.searchParams.get('code')

  if (!username || !code) {
    return NextResponse.json({ verified: false, error: 'Missing params' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ verified: false, error: 'Bot token not configured' })
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getChat?chat_id=@${username.replace('@', '')}`,
    )
    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ verified: false, error: 'Channel not found' })
    }

    const description = data.result?.description || ''
    return NextResponse.json({
      verified: description.includes(code),
      description: description.substring(0, 100),
    })
  } catch {
    return NextResponse.json({ verified: false, error: 'API error' })
  }
}
