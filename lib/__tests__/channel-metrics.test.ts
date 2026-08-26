import { describe, expect, it } from 'vitest'
import { formatEngagementRate, getEngagementRatePercent } from '../channel-metrics'

describe('getEngagementRatePercent', () => {
  it('returns (avg_views / subscribers) × 100 rounded to one decimal', () => {
    expect(getEngagementRatePercent(1000, 350)).toBe(35)
    expect(getEngagementRatePercent(10000, 1234)).toBe(12.3)
  })

  it('returns null when data is missing or zero', () => {
    expect(getEngagementRatePercent(0, 100)).toBeNull()
    expect(getEngagementRatePercent(100, 0)).toBeNull()
    expect(getEngagementRatePercent(null, 100)).toBeNull()
  })
})

describe('formatEngagementRate', () => {
  it('formats as percentage string or null', () => {
    expect(formatEngagementRate(1000, 250)).toBe('25%')
    expect(formatEngagementRate(0, 250)).toBeNull()
  })
})
