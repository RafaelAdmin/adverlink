import { createHash, randomBytes } from 'crypto'
import { isSafeAuthNextPath } from '@/lib/auth-urls'
export {
  getSocialOauthErrorMessage,
  isInstagramProfessionalAccount,
  SOCIAL_OAUTH_ERROR_MESSAGES,
} from '@/lib/social-oauth-messages'

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
export const SOCIAL_VERIFICATION_TTL_MS = 90 * 24 * 60 * 60 * 1000

export type SocialOauthPlatform = 'tiktok' | 'instagram'

export type OauthStateRecord = {
  state: string
  userId: string
  channelId: string
  platform: SocialOauthPlatform
  codeVerifier: string
  returnPath: string
  expiresAt: number
  consumedAt: number | null
}

export type ExternalAccountBinding = {
  channelId: string
  userId: string
  status: string
  expiresAt: number | null
}

export function isSocialOauthPlatform(value: string | null | undefined): value is SocialOauthPlatform {
  return value === 'tiktok' || value === 'instagram'
}

export function generateOauthState(): string {
  return randomBytes(32).toString('hex')
}

export function generatePkceVerifier(): string {
  return randomBytes(32).toString('base64url')
}

export function generatePkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function createOauthStateRecord(
  input: {
    state: string
    userId: string
    channelId: string
    platform: SocialOauthPlatform
    codeVerifier: string
    returnPath: string
  },
  now = Date.now(),
  ttlMs = OAUTH_STATE_TTL_MS,
): OauthStateRecord {
  const ttl = Math.max(1, Math.min(ttlMs, OAUTH_STATE_TTL_MS))
  return {
    ...input,
    returnPath: sanitizeOauthReturnPath(input.returnPath, input.channelId),
    expiresAt: now + ttl,
    consumedAt: null,
  }
}

export function consumeOauthState(
  record: OauthStateRecord | null | undefined,
  sessionUserId: string,
  now = Date.now(),
): { ok: true; record: OauthStateRecord } | { ok: false; reason: string } {
  if (!record) return { ok: false, reason: 'missing_state' }
  if (record.consumedAt) return { ok: false, reason: 'reused_state' }
  if (now >= record.expiresAt) return { ok: false, reason: 'expired_state' }
  if (record.userId !== sessionUserId) return { ok: false, reason: 'user_mismatch' }
  return { ok: true, record: { ...record, consumedAt: now } }
}

export function resolveExternalAccountBinding(
  existing: ExternalAccountBinding | null | undefined,
  incoming: { channelId: string; userId: string },
  now = Date.now(),
): { ok: true; action: 'create' | 'refresh' | 'rebind' } | { ok: false; reason: 'already_linked' } {
  if (!existing) return { ok: true, action: 'create' }
  if (existing.channelId === incoming.channelId) return { ok: true, action: 'refresh' }

  const active =
    existing.status === 'verified' &&
    (existing.expiresAt == null || existing.expiresAt > now)

  if (active) return { ok: false, reason: 'already_linked' }
  return { ok: true, action: 'rebind' }
}

export function sanitizeOauthReturnPath(path: string | null | undefined, channelId: string): string {
  const fallback = `/dashboard/verify-channel/${channelId}`
  if (!isSafeAuthNextPath(path)) return fallback
  if (!path.startsWith('/dashboard/')) return fallback
  return path
}

export function socialVerificationExpiresAt(verifiedAt = Date.now()): number {
  return verifiedAt + SOCIAL_VERIFICATION_TTL_MS
}

export function isSocialVerificationActive(
  status: string | null | undefined,
  expiresAt: string | number | Date | null | undefined,
  now = Date.now(),
): boolean {
  if (status !== 'verified') return false
  if (expiresAt == null || expiresAt === '') return true
  const expires = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime()
  if (!Number.isFinite(expires)) return true
  return expires > now
}

