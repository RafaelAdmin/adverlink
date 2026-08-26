import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import type { AvatarFrameColorId } from '@/lib/avatar-frame'
import { AVATAR_FRAME_OPTIONS } from '@/lib/avatar-frame'

const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!PAYMENTS_ENABLED) {
    return NextResponse.json(
      {
        error: 'payments_disabled',
        message: 'Покупка рамки временно недоступна. Скоро будет доступна.',
      },
      { status: 503 },
    )
  }

  let body: { frameColor?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const frameColor = body.frameColor as AvatarFrameColorId | undefined
  const validIds = AVATAR_FRAME_OPTIONS.map((o) => o.id)
  if (!frameColor || !validIds.includes(frameColor)) {
    return NextResponse.json({ error: 'Invalid frame color' }, { status: 400 })
  }

  return NextResponse.json(
    {
      error: 'payments_not_implemented',
      message: 'Обработка платежей ещё не подключена.',
    },
    { status: 503 },
  )
}
