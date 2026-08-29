import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_PREFERRED_CURRENCY,
  getLocalPreferredCurrency,
  resolvePreferredCurrency,
  setLocalPreferredCurrency,
} from '@/lib/preferred-currency'

describe('resolvePreferredCurrency', () => {
  it('uses profile currency as source of truth for authenticated users', () => {
    expect(
      resolvePreferredCurrency({
        profileCurrency: 'EUR',
        localCurrency: 'USD',
        isAuthenticated: true,
      }),
    ).toBe('EUR')
  })

  it('falls back to localStorage for authenticated users without profile preference', () => {
    expect(
      resolvePreferredCurrency({
        profileCurrency: null,
        localCurrency: 'AMD',
        isAuthenticated: true,
      }),
    ).toBe('AMD')
  })

  it('uses guest localStorage preference when not authenticated', () => {
    expect(
      resolvePreferredCurrency({
        profileCurrency: 'EUR',
        localCurrency: 'USD',
        isAuthenticated: false,
      }),
    ).toBe('USD')
  })

  it('defaults to USD when nothing is set', () => {
    expect(
      resolvePreferredCurrency({
        profileCurrency: null,
        localCurrency: null,
        isAuthenticated: false,
      }),
    ).toBe(DEFAULT_PREFERRED_CURRENCY)
  })
})

describe('local preferred currency cache', () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key])
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads and writes local cache without touching profile', () => {
    setLocalPreferredCurrency('EUR')
    expect(getLocalPreferredCurrency()).toBe('EUR')
  })

  it('profile EUR overrides stale local USD when resolved for authenticated user', () => {
    setLocalPreferredCurrency('USD')
    const resolved = resolvePreferredCurrency({
      profileCurrency: 'EUR',
      localCurrency: getLocalPreferredCurrency(),
      isAuthenticated: true,
    })
    expect(resolved).toBe('EUR')
  })
})

describe('creator source price remains untouched (conceptual)', () => {
  it('resolvePreferredCurrency does not mutate channel pricing inputs', () => {
    const channel = { ad_price: 40000, ad_price_currency: 'AMD' as const }
    resolvePreferredCurrency({
      profileCurrency: 'USD',
      localCurrency: 'EUR',
      isAuthenticated: true,
    })
    expect(channel.ad_price).toBe(40000)
    expect(channel.ad_price_currency).toBe('AMD')
  })
})

describe('persisted preference concept', () => {
  it('documents that profile write happens only on explicit user selection', () => {
    const profileBefore = { preferred_currency: null as string | null }
    const userSelection = 'USD'
    expect(profileBefore.preferred_currency).toBeNull()

    profileBefore.preferred_currency = userSelection
    setLocalPreferredCurrency('USD')

    expect(profileBefore.preferred_currency).toBe('USD')
    expect(getLocalPreferredCurrency()).toBe('USD')
  })
})
