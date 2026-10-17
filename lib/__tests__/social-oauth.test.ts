import { createHash } from 'crypto'
import { describe, expect, it } from 'vitest'
import {
  consumeOauthState,
  createOauthStateRecord,
  generatePkceChallenge,
  generatePkceVerifier,
  isInstagramProfessionalAccount,
  isSocialVerificationActive,
  OAUTH_STATE_TTL_MS,
  resolveExternalAccountBinding,
  sanitizeOauthReturnPath,
  socialVerificationExpiresAt,
  SOCIAL_VERIFICATION_TTL_MS,
} from '../social-oauth'
import { isChannelVerified } from '../channel-helpers'

describe('PKCE', () => {
  it('creates an S256 challenge from the verifier', () => {
    const verifier = generatePkceVerifier()
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    const challenge = generatePkceChallenge(verifier)
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'))
    expect(challenge).not.toBe(verifier)
  })
})

describe('OAuth state expiry and reuse', () => {
  const base = {
    state: 'abc',
    userId: 'user-1',
    channelId: 'channel-1',
    platform: 'tiktok' as const,
    codeVerifier: 'verifier',
    returnPath: '/dashboard/verify-channel/channel-1',
  }

  it('rejects expired state', () => {
    const now = 1_000_000
    const record = createOauthStateRecord(base, now)
    const result = consumeOauthState(record, 'user-1', now + OAUTH_STATE_TTL_MS)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('expired_state')
  })

  it('caps ttl at 10 minutes', () => {
    const now = 5_000
    const record = createOauthStateRecord(base, now, 60 * 60 * 1000)
    expect(record.expiresAt).toBe(now + OAUTH_STATE_TTL_MS)
  })

  it('rejects reused state', () => {
    const record = createOauthStateRecord(base, 1_000)
    const first = consumeOauthState(record, 'user-1', 1_100)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = consumeOauthState(first.record, 'user-1', 1_200)
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.reason).toBe('reused_state')
  })

  it('rejects a different user session', () => {
    const record = createOauthStateRecord(base, 1_000)
    const result = consumeOauthState(record, 'user-2', 1_100)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('user_mismatch')
  })

  it('accepts a fresh matching session', () => {
    const record = createOauthStateRecord(base, 1_000)
    const result = consumeOauthState(record, 'user-1', 1_100)
    expect(result.ok).toBe(true)
  })
})

describe('external account uniqueness', () => {
  it('allows the first bind', () => {
    expect(resolveExternalAccountBinding(null, { channelId: 'c1', userId: 'u1' })).toEqual({
      ok: true,
      action: 'create',
    })
  })

  it('refreshes the same channel', () => {
    expect(
      resolveExternalAccountBinding(
        { channelId: 'c1', userId: 'u1', status: 'verified', expiresAt: Date.now() + 1000 },
        { channelId: 'c1', userId: 'u1' },
      ),
    ).toEqual({ ok: true, action: 'refresh' })
  })

  it('blocks an active bind on another channel', () => {
    const result = resolveExternalAccountBinding(
      { channelId: 'c1', userId: 'u1', status: 'verified', expiresAt: Date.now() + 60_000 },
      { channelId: 'c2', userId: 'u2' },
    )
    expect(result).toEqual({ ok: false, reason: 'already_linked' })
  })

  it('allows rebind after expiry', () => {
    const result = resolveExternalAccountBinding(
      { channelId: 'c1', userId: 'u1', status: 'verified', expiresAt: 10 },
      { channelId: 'c2', userId: 'u2' },
      20,
    )
    expect(result).toEqual({ ok: true, action: 'rebind' })
  })
})

describe('90-day verification window', () => {
  it('expires after 90 days', () => {
    const verifiedAt = 1_000
    const expires = socialVerificationExpiresAt(verifiedAt)
    expect(expires - verifiedAt).toBe(SOCIAL_VERIFICATION_TTL_MS)
    expect(isSocialVerificationActive('verified', expires, expires)).toBe(false)
    expect(isSocialVerificationActive('verified', expires, expires - 1)).toBe(true)
  })

  it('does not treat telegram-style channels without expiry as expired', () => {
    expect(isChannelVerified({ is_verified: true, verification_status: 'verified' })).toBe(true)
    expect(
      isChannelVerified({
        is_verified: true,
        verification_status: 'verified',
        verification_expires_at: new Date(Date.now() - 1000).toISOString(),
      }),
    ).toBe(false)
  })
})

describe('return path and instagram account type', () => {
  it('rejects open redirects', () => {
    expect(sanitizeOauthReturnPath('https://evil.example', 'c1')).toBe('/dashboard/verify-channel/c1')
    expect(sanitizeOauthReturnPath('/auth/login', 'c1')).toBe('/dashboard/verify-channel/c1')
    expect(sanitizeOauthReturnPath('/dashboard/edit-channel/c1', 'c1')).toBe('/dashboard/edit-channel/c1')
  })

  it('accepts only professional instagram account types', () => {
    expect(isInstagramProfessionalAccount('BUSINESS')).toBe(true)
    expect(isInstagramProfessionalAccount('MEDIA_CREATOR')).toBe(true)
    expect(isInstagramProfessionalAccount('PERSONAL')).toBe(false)
    expect(isInstagramProfessionalAccount(null)).toBe(false)
  })
})
