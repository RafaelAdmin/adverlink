import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path')

  if (!filePath) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN

  try {
    const response = await fetch(
      `https://api.telegram.org/file/bot${token}/${filePath}`
    )

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
