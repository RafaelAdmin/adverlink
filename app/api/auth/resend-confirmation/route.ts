import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { allowAuthResend, getClientIp } from '@/lib/auth-rate-limit'
import { mapAuthErrorMessage } from '@/lib/auth-errors'
import { buildAuthCallbackUrl, getAuthRedirectOrigin, isValidEmail } from '@/lib/auth-urls'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: { email?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Некорректный запрос' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Укажите корректный email-адрес' }, { status: 400 })
  }

  const ip = getClientIp(request.headers)
  if (!allowAuthResend(email, ip)) {
    return NextResponse.json(
      { ok: false, error: 'Письмо уже отправлялось. Подождите минуту и попробуйте снова.' },
      { status: 429 },
    )
  }

  const origin = getAuthRedirectOrigin(new URL(request.url).origin)
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(origin),
    },
  })

  if (error) {
    const mapped = mapAuthErrorMessage(error.message)
    const status = error.message.toLowerCase().includes('rate') ? 429 : 400
    return NextResponse.json({ ok: false, error: mapped }, { status })
  }

  return NextResponse.json({
    ok: true,
    message: `Если аккаунт с адресом ${email} ещё не подтверждён, мы отправили новое письмо.`,
  })
}
