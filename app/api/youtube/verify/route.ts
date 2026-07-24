import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const channelInput = request.nextUrl.searchParams.get('channel')
  const code = request.nextUrl.searchParams.get('code')

  if (!channelInput || !code) {
    return NextResponse.json({ verified: false, error: 'Missing params' })
  }

  const apiKey = process.env.YOUTUBE_API_KEY

  try {
    let handle = channelInput.trim()
    if (handle.includes('youtube.com/')) {
      const match = handle.match(/youtube\.com\/@([^/?]+)/)
        || handle.match(/youtube\.com\/channel\/([^/?]+)/)
      if (match) handle = match[1]
    }
    if (handle.startsWith('@')) handle = handle.slice(1)

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${handle}&key=${apiKey}`
    )
    const data = await res.json()

    let channel = data.items?.[0]

    if (!channel && handle.startsWith('UC')) {
      const idRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${handle}&key=${apiKey}`
      )
      const idData = await idRes.json()
      channel = idData.items?.[0]
    }

    if (!channel) {
      return NextResponse.json({ verified: false, error: 'Channel not found' })
    }

    const description = channel.snippet?.description || ''
    const verified = description.includes(code)

    return NextResponse.json({
      verified,
      description: description.substring(0, 200),
    })
  } catch {
    return NextResponse.json({ verified: false, error: 'API error' })
  }
}
