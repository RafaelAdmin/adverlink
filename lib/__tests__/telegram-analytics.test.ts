import { describe, expect, it } from 'vitest'
import {
  aggregatePostViews,
  ANALYTICS_MIN_POSTS,
  computeCpm,
  computeCpm24,
  computeErr,
  computeErr24,
  err24Metric,
  getAnalyticsCollectionState,
  trimmedAverage,
} from '../telegram-analytics'

describe('trimmedAverage', () => {
  it('returns simple average when fewer than 10 values', () => {
    expect(trimmedAverage([100, 200, 300])).toBe(200)
  })

  it('trims top and bottom 10% when at least 10 values', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 1000]
    const avg = trimmedAverage(values)
    expect(avg).not.toBeNull()
    expect(avg!).toBeLessThan(200)
    expect(avg!).toBeGreaterThan(40)
  })

  it('returns null for empty input', () => {
    expect(trimmedAverage([])).toBeNull()
  })
})

describe('ERR / ERR24', () => {
  it('computes ERR as avgViews / subscribers × 100', () => {
    expect(computeErr(1000, 350)).toBe(35)
  })

  it('computes ERR24 from 24h views only', () => {
    expect(computeErr24(2000, 400)).toBe(20)
  })

  it('returns null for insufficient inputs', () => {
    expect(computeErr(0, 100)).toBeNull()
    expect(computeErr24(100, 0)).toBeNull()
  })
})

describe('CPM / CPM24', () => {
  it('computes CPM as price / avgViews × 1000', () => {
    expect(computeCpm(100, 5000)).toBe(20)
  })

  it('computes CPM24 from 24h average views', () => {
    expect(computeCpm24(50, 2500)).toBe(20)
  })
})

describe('aggregatePostViews', () => {
  it('aggregates recent posts with trimmed average', () => {
    const posts = Array.from({ length: 12 }, (_, i) => ({
      views: 100 + i * 10,
      views24h: i >= 2 ? 80 + i * 5 : null,
    }))
    const result = aggregatePostViews(posts)
    expect(result.eligibleCount).toBe(12)
    expect(result.avgViews).toBeGreaterThan(0)
    expect(result.eligible24hCount).toBe(10)
  })
})

describe('getAnalyticsCollectionState', () => {
  it('reports collecting until enough view data', () => {
    const state = getAnalyticsCollectionState({
      analyticsStatus: 'connected',
      postsTracked: 3,
      hasViewMetrics: false,
    })
    expect(state.status).toBe('collecting')
    if (state.status === 'collecting') {
      expect(state.postsTracked).toBe(3)
      expect(state.minPosts).toBe(ANALYTICS_MIN_POSTS)
    }
  })

  it('becomes active with enough posts and view metrics', () => {
    const state = getAnalyticsCollectionState({
      analyticsStatus: 'collecting',
      postsTracked: 12,
      hasViewMetrics: true,
    })
    expect(state.status).toBe('active')
  })
})

describe('err24Metric', () => {
  it('returns collecting when no 24h snapshots exist', () => {
    const metric = err24Metric(1000, null, 0)
    expect(metric.kind).toBe('collecting')
  })

  it('does not return zero for missing data', () => {
    const metric = err24Metric(1000, null, 0)
    expect(metric).not.toEqual({ kind: 'value', value: 0 })
  })
})
