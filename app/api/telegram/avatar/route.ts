import { NextRequest, NextResponse } from 'next/server'

/** Only allow Telegram photo paths returned by getFile — blocks path traversal / SSRF */
const ALLOWED_PATH = /^[\w/]+\.(jpg|jpeg|png|webp)$/i

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path')

  if (!filePath || !ALLOWED_PATH.test(filePath) || filePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)

    if (!response.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: 500 })
  }
}
