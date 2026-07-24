import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const channelInput = request.nextUrl.searchParams.get('channel')

  if (!channelInput) {
    return NextResponse.json({ error: 'Channel required' }, { status: 400 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'YouTube API not configured' }, { status: 500 })
  }

  try {
    let channelId = ''
    const input = channelInput.trim()

    let handle = input
    if (input.includes('youtube.com/')) {
      const match = input.match(/youtube\.com\/@([^/?]+)/)
        || input.match(/youtube\.com\/channel\/([^/?]+)/)
        || input.match(/youtube\.com\/c\/([^/?]+)/)
      if (match) handle = match[1]
    }
    if (handle.startsWith('@')) handle = handle.slice(1)

    const handleRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handle}&key=${apiKey}`
    )
    const handleData = await handleRes.json()

    let channel = handleData.items?.[0]

    if (!channel && handle.startsWith('UC')) {
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${handle}&key=${apiKey}`
      )
      const channelData = await channelRes.json()
      channel = channelData.items?.[0]
    }

    if (!channel && !handle.startsWith('UC')) {
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handle)}&maxResults=1&key=${apiKey}`
      )
      const searchData = await searchRes.json()
      channelId = searchData.items?.[0]?.id?.channelId || ''

      if (channelId) {
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
        )
        const channelData = await channelRes.json()
        channel = channelData.items?.[0]
      }
    }

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const snippet = channel.snippet
    const stats = channel.statistics

    return NextResponse.json({
      name: snippet.title,
      description: snippet.description?.slice(0, 500) || '',
      subscriber_count: parseInt(stats.subscriberCount || '0'),
      avg_views: 0,
      avatar_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || null,
      platform: 'youtube',
      channel_id: channel.id,
    })
  } catch {
    return NextResponse.json({ error: 'API error' }, { status: 500 })
  }
}
