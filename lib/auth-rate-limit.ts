import { checkRateLimit } from '@/lib/notify-auth'

const store = new Map<string, { count: number; resetAt: number }>()

export const AUTH_RESEND_EMAIL_WINDOW_MS = 60_000
export const AUTH_RESEND_EMAIL_MAX = 1
export const AUTH_RESEND_IP_WINDOW_MS = 10 * 60_000
export const AUTH_RESEND_IP_MAX = 5

export function allowAuthResend(email: string, ip: string, now = Date.now()): boolean {
  const emailKey = `resend:email:${email.trim().toLowerCase()}`
  const ipKey = `resend:ip:${ip || 'unknown'}`

  const emailOk = checkRateLimit(store, emailKey, AUTH_RESEND_EMAIL_MAX, AUTH_RESEND_EMAIL_WINDOW_MS, now)
  if (!emailOk) return false

  return checkRateLimit(store, ipKey, AUTH_RESEND_IP_MAX, AUTH_RESEND_IP_WINDOW_MS, now)
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return headers.get('x-real-ip') || 'unknown'
}
