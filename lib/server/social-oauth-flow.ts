import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/notify-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  consumeOauthState,
  createOauthStateRecord,
  generateOauthState,
  generatePkceVerifier,
  getSocialOauthErrorMessage,
  isSocialOauthPlatform,
  sanitizeOauthReturnPath,
  type OauthStateRecord,
  type SocialOauthPlatform,
} from '@/lib/social-oauth'
import { buildProviderAuthorizeUrl, exchangeCodeForSocialProfile } from '@/lib/server/social-oauth-providers'

const oauthStartStore = new Map<string, { count: number; resetAt: number }>()

function redirectToChannel(
  request: NextRequest,
  returnPath: string,
  params: Record<string, string>,
) {
  const url = new URL(returnPath, request.url)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  return NextResponse.redirect(url)
}

function mapOauthSession(row: {
  state: string
  user_id: string
  channel_id: string
  platform: string
  code_verifier: string
  return_path: string
  expires_at: string
  consumed_at: string | null
}): OauthStateRecord | null {
  if (!isSocialOauthPlatform(row.platform)) return null
  return {
    state: row.state,
    userId: row.user_id,
    channelId: row.channel_id,
    platform: row.platform,
    codeVerifier: row.code_verifier,
    returnPath: row.return_path,
    expiresAt: new Date(row.expires_at).getTime(),
    consumedAt: row.consumed_at ? new Date(row.consumed_at).getTime() : null,
  }
}

export async function startSocialOauth(request: NextRequest, platform: SocialOauthPlatform) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (!checkRateLimit(oauthStartStore, `oauth-start:${session.user.id}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: getSocialOauthErrorMessage('rate_limited') }, { status: 429 })
  }

  const channelId = request.nextUrl.searchParams.get('channelId')
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
  }

  const { data: channel } = await session.supabase
    .from('channels')
    .select('id, owner_id, platform')
    .eq('id', channelId)
    .single()

  if (!channel || channel.owner_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (channel.platform !== platform) {
    return NextResponse.json({ error: getSocialOauthErrorMessage('platform_mismatch') }, { status: 400 })
  }

  const state = generateOauthState()
  const codeVerifier = generatePkceVerifier()
  const authorizeUrl = buildProviderAuthorizeUrl({ platform, state, codeVerifier })
  if (typeof authorizeUrl === 'object') {
    return NextResponse.json({ error: getSocialOauthErrorMessage('not_configured') }, { status: 503 })
  }

  const returnPath = sanitizeOauthReturnPath(
    request.nextUrl.searchParams.get('next'),
    channelId,
  )
  const record = createOauthStateRecord({
    state,
    userId: session.user.id,
    channelId,
    platform,
    codeVerifier,
    returnPath,
  })

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('oauth_verification_sessions').insert({
      state: record.state,
      user_id: record.userId,
      channel_id: record.channelId,
      platform: record.platform,
      code_verifier: record.codeVerifier,
      return_path: record.returnPath,
      expires_at: new Date(record.expiresAt).toISOString(),
    })
    if (error) {
      console.error('[social-oauth] failed to persist state')
      return NextResponse.json({ error: getSocialOauthErrorMessage('oauth_failed') }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: getSocialOauthErrorMessage('not_configured') }, { status: 503 })
  }

  return NextResponse.redirect(authorizeUrl)
}

export async function handleSocialOauthCallback(request: NextRequest, platform: SocialOauthPlatform) {
  const fallbackPath = '/dashboard'
  const providerError = request.nextUrl.searchParams.get('error')
  const state = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')

  const session = await requireAuth()
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  let returnPath = fallbackPath
  let persisted: OauthStateRecord | null = null

  try {
    const admin = createAdminClient()
    if (state) {
      const { data } = await admin
        .from('oauth_verification_sessions')
        .select('state, user_id, channel_id, platform, code_verifier, return_path, expires_at, consumed_at')
        .eq('state', state)
        .maybeSingle()
      persisted = data ? mapOauthSession(data) : null
      if (persisted) returnPath = persisted.returnPath
    }

    if (providerError) {
      return redirectToChannel(request, returnPath, {
        verification: 'error',
        reason: 'oauth_denied',
      })
    }

    if (!code || !state) {
      return redirectToChannel(request, returnPath, {
        verification: 'error',
        reason: 'oauth_failed',
      })
    }

    const usable = consumeOauthState(persisted, session.user.id)
    if (!usable.ok) {
      return redirectToChannel(request, returnPath, {
        verification: 'error',
        reason: usable.reason,
      })
    }

    if (usable.record.platform !== platform) {
      return redirectToChannel(request, returnPath, {
        verification: 'error',
        reason: 'platform_mismatch',
      })
    }

    const { data: consumed, error: consumeError } = await admin
      .from('oauth_verification_sessions')
      .update({ consumed_at: new Date().toISOString() })
      .eq('state', state)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .select('state')
      .maybeSingle()

    if (consumeError || !consumed) {
      return redirectToChannel(request, usable.record.returnPath, {
        verification: 'error',
        reason: 'reused_state',
      })
    }

    let profile
    try {
      profile = await exchangeCodeForSocialProfile({
        platform,
        code,
        codeVerifier: usable.record.codeVerifier,
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'oauth_failed'
      const allowed = [
        'instagram_not_professional',
        'missing_external_id',
        'not_configured',
        'oauth_failed',
      ]
      return redirectToChannel(request, usable.record.returnPath, {
        verification: 'error',
        reason: allowed.includes(reason) ? reason : 'oauth_failed',
      })
    }

    const { data: rpcResult, error: rpcError } = await admin.rpc('complete_social_account_verification', {
      p_user_id: usable.record.userId,
      p_channel_id: usable.record.channelId,
      p_platform: platform,
      p_external_account_id: profile.externalAccountId,
      p_username: profile.username,
      p_profile_url: profile.profileUrl,
      p_display_name: profile.displayName,
      p_avatar_url: profile.avatarUrl,
    })

    if (rpcError) {
      console.error('[social-oauth] verification rpc failed')
      return redirectToChannel(request, usable.record.returnPath, {
        verification: 'error',
        reason: 'oauth_failed',
      })
    }

    const result = rpcResult as { ok?: boolean; reason?: string } | null
    if (!result?.ok) {
      return redirectToChannel(request, usable.record.returnPath, {
        verification: 'error',
        reason: result?.reason || 'oauth_failed',
      })
    }

    return redirectToChannel(request, usable.record.returnPath, {
      verification: 'success',
    })
  } catch {
    return redirectToChannel(request, returnPath, {
      verification: 'error',
      reason: 'oauth_failed',
    })
  }
}
