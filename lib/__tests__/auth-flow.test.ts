import { describe, expect, it } from 'vitest'
import { describeSignUpIdentityConflict, mapAuthErrorMessage } from '@/lib/auth-errors'
import { allowAuthResend } from '@/lib/auth-rate-limit'
import {
  buildAuthCallbackUrl,
  isSafeAuthNextPath,
  isStrongEnoughPassword,
  isValidEmail,
  sanitizeAuthNextPath,
} from '@/lib/auth-urls'

describe('auth email validation', () => {
  it('accepts any syntactically valid provider', () => {
    expect(isValidEmail('user@gmail.com')).toBe(true)
    expect(isValidEmail('name.plus+tag@yandex.ru')).toBe(true)
    expect(isValidEmail('a@proton.me')).toBe(true)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('password strength', () => {
  it('rejects short passwords', () => {
    expect(isStrongEnoughPassword('1234567')).toBe(false)
    expect(isStrongEnoughPassword('12345678')).toBe(true)
  })
})

describe('auth callback next path', () => {
  it('rejects open redirects', () => {
    expect(isSafeAuthNextPath('https://evil.example')).toBe(false)
    expect(isSafeAuthNextPath('//evil.example')).toBe(false)
    expect(isSafeAuthNextPath('/dashboard')).toBe(true)
    expect(sanitizeAuthNextPath('https://evil.example')).toBe('/dashboard')
  })

  it('builds callback url with encoded next', () => {
    expect(buildAuthCallbackUrl('https://www.adverlink.am', '/dashboard')).toBe(
      'https://www.adverlink.am/auth/callback?next=%2Fdashboard',
    )
  })
})

describe('mapAuthErrorMessage', () => {
  it('maps known supabase errors', () => {
    expect(mapAuthErrorMessage('User already registered')).toMatch(/уже зарегистрирован/)
    expect(mapAuthErrorMessage('Email not confirmed')).toMatch(/не подтвержд/)
    expect(mapAuthErrorMessage('Invalid login credentials')).toMatch(/Неверный email/)
    expect(mapAuthErrorMessage('Password should be at least 8 characters')).toMatch(/слабый/)
    expect(mapAuthErrorMessage('Error sending confirmation email')).toMatch(/Не удалось отправить/)
    expect(mapAuthErrorMessage('Email link is invalid or has expired')).toMatch(/недействительна/)
  })
})

describe('signUp identity conflict', () => {
  it('treats empty identities as already registered', () => {
    expect(describeSignUpIdentityConflict(0)).toBe(true)
    expect(describeSignUpIdentityConflict(1)).toBe(false)
  })
})

describe('auth resend rate limit', () => {
  it('allows first request and blocks immediate repeat for same email', () => {
    const now = Date.now()
    const email = `unique-${now}@example.com`
    const ip = `203.0.113.${now % 250}`
    expect(allowAuthResend(email, ip, now)).toBe(true)
    expect(allowAuthResend(email, ip, now + 1000)).toBe(false)
  })
})
