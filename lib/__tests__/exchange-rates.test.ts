import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  EXCHANGE_RATES_CACHE_MS,
  fetchExchangeRates,
  getExchangeRates,
  resetExchangeRatesCacheForTests,
} from '@/lib/currency'

describe('fetchExchangeRates', () => {
  beforeEach(() => {
    resetExchangeRatesCacheForTests()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    resetExchangeRatesCacheForTests()
    vi.unstubAllGlobals()
  })

  it('uses network rates when fetch succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rates: { USD: 1, EUR: 0.92, AMD: 387 } }),
      }),
    )

    const result = await fetchExchangeRates(1_000)
    expect(result.source).toBe('network')
    expect(result.rates?.EUR).toBe(0.92)
  })

  it('returns unavailable instead of hard-coded fallback when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await fetchExchangeRates(1_000)
    expect(result.source).toBe('unavailable')
    expect(result.rates).toBeNull()
  })

  it('returns unavailable when response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    )

    const result = await fetchExchangeRates(1_000)
    expect(result.source).toBe('unavailable')
    expect(result.rates).toBeNull()
  })

  it('serves cached rates inside freshness window', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { USD: 1, EUR: 0.92, AMD: 387 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchExchangeRates(10_000)
    const cached = await fetchExchangeRates(10_000 + EXCHANGE_RATES_CACHE_MS - 1)

    expect(cached.source).toBe('cache')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not serve expired cache after freshness window without fresh fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: { USD: 1, EUR: 0.92, AMD: 387 } }),
      })
      .mockRejectedValueOnce(new Error('network down'))

    vi.stubGlobal('fetch', fetchMock)

    await fetchExchangeRates(10_000)
    const staleAttempt = await fetchExchangeRates(10_000 + EXCHANGE_RATES_CACHE_MS + 1)

    expect(staleAttempt.source).toBe('unavailable')
    expect(staleAttempt.rates).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('getExchangeRates', () => {
  beforeEach(() => {
    resetExchangeRatesCacheForTests()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    resetExchangeRatesCacheForTests()
    vi.unstubAllGlobals()
  })

  it('returns empty object when no trustworthy rates exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(getExchangeRates()).resolves.toEqual({})
  })
})
