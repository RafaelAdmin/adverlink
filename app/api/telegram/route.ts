/*
To fix existing channels with expired Telegram URLs, run this in Supabase SQL Editor:
update channels set avatar_url = null where avatar_url like '%api/telegram/avatar%';
This will show placeholder letters until channels are re-added or manually updated.
*/
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const username = request.nextUrl.searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
  }

  const cleanUsername = username.replace('@', '').replace(/[^a-zA-Z0-9_]/g, '')
  if (!cleanUsername) {
    return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
  }

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
          `https://api.telegram.org/bot${token}/getFile?file_id=${chat.photo.big_file_id}`,
        )
        const fileData = await fileRes.json()

        if (fileData.ok) {
          const filePath = fileData.result.file_path

          avatarUrl = `/api/telegram/avatar?path=${encodeURIComponent(filePath)}`

          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          )

          try {
            const imageResponse = await fetch(
              `https://api.telegram.org/file/bot${token}/${filePath}`,
            )

            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer()
              const uint8Array = new Uint8Array(imageBuffer)
              const storagePath = `channels/${cleanUsername}/avatar.jpg`

              const { error: uploadError } = await supabaseAdmin.storage
                .from('avatars')
                .upload(storagePath, uint8Array, {
                  contentType: 'image/jpeg',
                  upsert: true,
                })

              if (!uploadError) {
                const {
                  data: { publicUrl },
                } = supabaseAdmin.storage.from('avatars').getPublicUrl(storagePath)
                avatarUrl = publicUrl
              }
            }
          } catch {
            // Fall back to proxy URL
          }
        }
      } catch {
        // Avatar optional
      }
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
