import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const cleanUsername = username.replace('@', '')

  try {
    const [chatRes, countRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=@${cleanUsername}`),
      fetch(`https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=@${cleanUsername}`),
    ])

    const chatData = await chatRes.json()
    const countData = await countRes.json()

    if (!chatData.ok) {
      return NextResponse.json({ error: 'Канал не найден' }, { status: 404 })
    }

    const chat = chatData.result
    let avatarUrl = null

    if (chat.photo?.big_file_id) {
      try {
        const fileRes = await fetch(
          `https://api.telegram.org/bot${token}/getFile?file_id=${chat.photo.big_file_id}`
        )
        const fileData = await fileRes.json()

        if (fileData.ok) {
          const filePath = fileData.result.file_path
          avatarUrl = `https://api.telegram.org/file/bot${token}/${filePath}`
        }
      } catch {}
    }

    return NextResponse.json({
      name: chat.title,
      username: chat.username,
      description: chat.description || '',
      subscriber_count: countData.ok ? countData.result : 0,
      avatar_url: avatarUrl,
    })

  } catch {
    return NextResponse.json({ error: 'Ошибка подключения' }, { status: 500 })
  }
}