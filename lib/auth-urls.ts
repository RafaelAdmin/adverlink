export const DEFAULT_AUTH_NEXT_PATH = '/dashboard'
export const PASSWORD_RESET_NEXT_PATH = '/auth/login/password'
export const CHECK_EMAIL_PATH = '/auth/check-email'
export const MIN_PASSWORD_LENGTH = 8

/** Prevent open redirects after auth callback. */
export function isSafeAuthNextPath(path: string | null | undefined): path is string {
  if (!path) return false
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.includes('://') || path.includes('\\')) return false
  return true
}

export function sanitizeAuthNextPath(path: string | null | undefined, fallback = DEFAULT_AUTH_NEXT_PATH): string {
  return isSafeAuthNextPath(path) ? path : fallback
}

export function getConfiguredAppOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!raw) return null
  return raw.replace(/\/$/, '')
}

export function getAuthRedirectOrigin(requestOrigin?: string): string {
  return getConfiguredAppOrigin() || requestOrigin || 'https://www.adverlink.am'
}

export function buildAuthCallbackUrl(origin: string, next = DEFAULT_AUTH_NEXT_PATH): string {
  const safeNext = sanitizeAuthNextPath(next)
  return `${origin.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(safeNext)}`
}

export function getClientAuthCallbackUrl(next = DEFAULT_AUTH_NEXT_PATH): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : getAuthRedirectOrigin()
  return buildAuthCallbackUrl(origin, next)
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  if (trimmed.length < 3 || trimmed.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export function isStrongEnoughPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}

export function isEmailConfirmed(user: { email_confirmed_at?: string | null } | null | undefined): boolean {
  return Boolean(user?.email_confirmed_at)
}
