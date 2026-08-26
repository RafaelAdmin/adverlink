import { describe, expect, it } from 'vitest'
import { validateCronRequest } from '@/lib/cron-auth'

describe('validateCronRequest', () => {
  it('rejects when CRON_SECRET is missing', () => {
    const result = validateCronRequest('Bearer secret', undefined)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(503)
    }
  })

  it('rejects when CRON_SECRET is empty', () => {
    const result = validateCronRequest('Bearer secret', '')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(503)
    }
  })

  it('rejects wrong bearer token', () => {
    const result = validateCronRequest('Bearer wrong', 'expected-secret')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(401)
    }
  })

  it('accepts matching bearer token', () => {
    const result = validateCronRequest('Bearer expected-secret', 'expected-secret')
    expect(result).toEqual({ ok: true })
  })
})
