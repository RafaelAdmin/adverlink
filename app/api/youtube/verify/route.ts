import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

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

  try {
    const ytChannel = await resolveYouTubeChannel(channel.telegram_username || '', apiKey)
    if (!ytChannel) {
      return NextResponse.json({ verified: false, error: 'Channel not found' })
    }

    const description = ytChannel.snippet?.description || ''
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
      description: description.substring(0, 200),
    })
  } catch {
    return NextResponse.json({ verified: false, error: 'API error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const channelInput = request.nextUrl.searchParams.get('channel')
  const code = request.nextUrl.searchParams.get('code')

  if (!channelInput || !code) {
    return NextResponse.json({ verified: false, error: 'Missing params' })
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ verified: false, error: 'YouTube API not configured' })
  }

  try {
    const channel = await resolveYouTubeChannel(channelInput, apiKey)
    if (!channel) {
      return NextResponse.json({ verified: false, error: 'Channel not found' })
    }

    const description = channel.snippet?.description || ''
    return NextResponse.json({
      verified: description.includes(code),
      description: description.substring(0, 200),
    })
  } catch {
    return NextResponse.json({ verified: false, error: 'API error' })
  }
}
