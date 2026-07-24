import { NextRequest, NextResponse } from 'next/server'

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
    const verified = description.includes(code)

    return NextResponse.json({
      verified,
      description: description.substring(0, 100),
    })
  } catch {
    return NextResponse.json({ verified: false, error: 'API error' })
  }
}
