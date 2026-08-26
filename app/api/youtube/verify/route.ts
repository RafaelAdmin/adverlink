import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { verifyCodeInDescription } from '@/lib/verification-check'

async function resolveYouTubeChannel(handle: string, apiKey: string) {
  let normalized = handle.trim()
  if (normalized.includes('youtube.com/')) {
    const match =
      normalized.match(/youtube\.com\/@([^/?]+)/) ||
      normalized.match(/youtube\.com\/channel\/([^/?]+)/)
    if (match) normalized = match[1]
  }
  if (normalized.startsWith('@')) normalized = normalized.slice(1)

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${normalized}&key=${apiKey}`,
  )
  const data = await res.json()
  let channel = data.items?.[0]

  if (!channel && normalized.startsWith('UC')) {
    const idRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${normalized}&key=${apiKey}`,
    )
    const idData = await idRes.json()
    channel = idData.items?.[0]
  }

  return channel
}

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

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ verified: false, error: 'YouTube API not configured' }, { status: 500 })
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

  try {
    const ytChannel = await resolveYouTubeChannel(channel.telegram_username || '', apiKey)
    if (!ytChannel) {
      return NextResponse.json({ verified: false, error: 'Channel not found' })
    }

    const description = ytChannel.snippet?.description || ''
    const verified = verifyCodeInDescription(code, channel.verification_code, description)

    if (verified) {
      const { error: updateError } = await supabase.rpc('verify_channel_after_check', {
        p_channel_id: channelId,
      })

      if (updateError) {
        console.error('YouTube verify RPC error:', updateError.message)
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
