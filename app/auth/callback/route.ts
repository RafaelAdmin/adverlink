import { NextRequest, NextResponse } from 'next/server'
import { createAuthCallbackClient } from '@/lib/supabase-server'
import {
  CHECK_EMAIL_PATH,
  DEFAULT_AUTH_NEXT_PATH,
  getAuthRedirectOrigin,
  sanitizeAuthNextPath,
} from '@/lib/auth-urls'
import { isEmailConfirmed } from '@/lib/auth-urls'

async function ensureProfile(
  supabase: ReturnType<typeof createAuthCallbackClient>,
  userId: string,
  fullName: string | null,
) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: fullName,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  )

  if (error && process.env.NODE_ENV === 'development') {
    console.warn('[auth-callback] profile upsert', error.message)
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const errorParam = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')
  const next = sanitizeAuthNextPath(url.searchParams.get('next'), DEFAULT_AUTH_NEXT_PATH)
  const origin = getAuthRedirectOrigin(url.origin)

  if (errorParam) {
    const login = new URL('/auth/login', origin)
    login.searchParams.set('error', 'invalid_link')
    if (errorDescription) login.searchParams.set('detail', errorDescription)
    return NextResponse.redirect(login)
  }

  if (!code) {
    const login = new URL('/auth/login', origin)
    login.searchParams.set('error', 'invalid_link')
    return NextResponse.redirect(login)
  }

  const redirectUrl = new URL(next, origin)
  const response = NextResponse.redirect(redirectUrl)
  const supabase = createAuthCallbackClient(request, response)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const login = new URL('/auth/login', origin)
    login.searchParams.set('error', 'invalid_link')
    return NextResponse.redirect(login)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const fullName =
      typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null
    await ensureProfile(supabase, user.id, fullName)

    if (!isEmailConfirmed(user) && next !== '/auth/login/password') {
      const checkEmail = new URL(CHECK_EMAIL_PATH, origin)
      if (user.email) checkEmail.searchParams.set('email', user.email)
      const gated = NextResponse.redirect(checkEmail)
      response.cookies.getAll().forEach((cookie) => gated.cookies.set(cookie))
      return gated
    }
  }

  return response
}
