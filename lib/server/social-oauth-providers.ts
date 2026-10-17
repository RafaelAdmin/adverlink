import { generatePkceChallenge, isInstagramProfessionalAccount } from '@/lib/social-oauth'
import type { SocialOauthPlatform } from '@/lib/social-oauth'

export type SocialProfile = {
  externalAccountId: string
  username: string | null
  profileUrl: string | null
  displayName: string | null
  avatarUrl: string | null
}

type TokenResponse = {
  accessToken: string
}

function formBody(data: Record<string, string>) {
  return new URLSearchParams(data)
}

export function getOauthRedirectUri(platform: SocialOauthPlatform): string | null {
  const value =
    platform === 'tiktok'
      ? process.env.TIKTOK_REDIRECT_URI
      : process.env.INSTAGRAM_REDIRECT_URI
  const trimmed = value?.trim()
  return trimmed || null
}

export function buildProviderAuthorizeUrl(input: {
  platform: SocialOauthPlatform
  state: string
  codeVerifier: string
}): string | { error: 'not_configured' } {
  const redirectUri = getOauthRedirectUri(input.platform)
  const challenge = generatePkceChallenge(input.codeVerifier)

  if (input.platform === 'tiktok') {
    const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim()
    if (!clientKey || !redirectUri) return { error: 'not_configured' }
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/')
    url.searchParams.set('client_key', clientKey)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'user.info.basic,user.info.profile')
    url.searchParams.set('state', input.state)
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')
    return url.toString()
  }

  const appId = process.env.META_APP_ID?.trim()
  if (!appId || !redirectUri) return { error: 'not_configured' }
  const url = new URL('https://www.instagram.com/oauth/authorize')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'instagram_business_basic')
  url.searchParams.set('state', input.state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

async function exchangeTikTokToken(code: string, codeVerifier: string): Promise<TokenResponse> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim()
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim()
  const redirectUri = getOauthRedirectUri('tiktok')
  if (!clientKey || !clientSecret || !redirectUri) {
    throw new Error('not_configured')
  }

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: formBody({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  const data = await res.json().catch(() => null)
  const accessToken = data?.access_token
  if (!res.ok || typeof accessToken !== 'string' || !accessToken) {
    throw new Error('oauth_failed')
  }
  return { accessToken }
}

async function fetchTikTokProfile(accessToken: string): Promise<SocialProfile> {
  const fields = 'open_id,union_id,avatar_url,display_name,username,profile_deep_link'
  const res = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => null)
  const user = data?.data?.user
  const openId = typeof user?.open_id === 'string' ? user.open_id : null
  if (!res.ok || !openId) {
    throw new Error('missing_external_id')
  }
  const username = typeof user.username === 'string' ? user.username.replace(/^@/, '') : null
  return {
    externalAccountId: openId,
    username,
    profileUrl:
      typeof user.profile_deep_link === 'string'
        ? user.profile_deep_link
        : username
          ? `https://www.tiktok.com/@${username}`
          : null,
    displayName: typeof user.display_name === 'string' ? user.display_name : null,
    avatarUrl: typeof user.avatar_url === 'string' ? user.avatar_url : null,
  }
}

async function exchangeInstagramToken(code: string, codeVerifier: string): Promise<TokenResponse & { userId?: string }> {
  const appId = process.env.META_APP_ID?.trim()
  const appSecret = process.env.META_APP_SECRET?.trim()
  const redirectUri = getOauthRedirectUri('instagram')
  if (!appId || !appSecret || !redirectUri) {
    throw new Error('not_configured')
  }

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: formBody({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  })

  const data = await res.json().catch(() => null)
  const accessToken = data?.access_token || data?.data?.[0]?.access_token
  const userId = data?.user_id || data?.data?.[0]?.user_id
  if (!res.ok || typeof accessToken !== 'string' || !accessToken) {
    throw new Error('oauth_failed')
  }
  return { accessToken, userId: userId != null ? String(userId) : undefined }
}

async function fetchInstagramProfile(accessToken: string, fallbackUserId?: string): Promise<SocialProfile> {
  const res = await fetch(
    'https://graph.instagram.com/v21.0/me?fields=user_id,username,name,account_type,profile_picture_url',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error('instagram_not_professional')
  }

  const accountType = typeof data?.account_type === 'string' ? data.account_type : null
  if (accountType && !isInstagramProfessionalAccount(accountType)) {
    throw new Error('instagram_not_professional')
  }

  const externalAccountId = String(data?.user_id || data?.id || fallbackUserId || '')
  if (!externalAccountId) {
    throw new Error('instagram_not_professional')
  }

  const username = typeof data?.username === 'string' ? data.username.replace(/^@/, '') : null
  return {
    externalAccountId,
    username,
    profileUrl: username ? `https://instagram.com/${username}` : null,
    displayName: typeof data?.name === 'string' ? data.name : username,
    avatarUrl: typeof data?.profile_picture_url === 'string' ? data.profile_picture_url : null,
  }
}

export async function exchangeCodeForSocialProfile(input: {
  platform: SocialOauthPlatform
  code: string
  codeVerifier: string
}): Promise<SocialProfile> {
  if (input.platform === 'tiktok') {
    const token = await exchangeTikTokToken(input.code, input.codeVerifier)
    try {
      return await fetchTikTokProfile(token.accessToken)
    } finally {
      token.accessToken = ''
    }
  }

  const token = await exchangeInstagramToken(input.code, input.codeVerifier)
  try {
    return await fetchInstagramProfile(token.accessToken, token.userId)
  } finally {
    token.accessToken = ''
  }
}
