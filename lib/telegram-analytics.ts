/** Minimum tracked posts before channel analytics can be considered active. */
export const ANALYTICS_MIN_POSTS = 10

/** Max recent posts used for trimmed average views. */
export const ANALYTICS_MAX_POSTS = 20

/** Trim fraction from each tail when posts >= ANALYTICS_MIN_POSTS. */
export const TRIM_FRACTION = 0.1

export type MetricValue =
  | { kind: 'value'; value: number }
  | { kind: 'missing' }
  | { kind: 'collecting'; label?: string }

export type PostViewInput = {
  views: number | null | undefined
  views24h?: number | null | undefined
}

/**
 * Deterministic trimmed mean: with >=10 values, drop ~10% from each end.
 */
export function trimmedAverage(values: number[]): number | null {
  const sorted = [...values].filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b)
  if (sorted.length === 0) return null

  if (sorted.length < ANALYTICS_MIN_POSTS) {
    const sum = sorted.reduce((a, b) => a + b, 0)
    return Math.round(sum / sorted.length)
  }

  const trimCount = Math.max(1, Math.floor(sorted.length * TRIM_FRACTION))
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount)
  if (trimmed.length === 0) return null
  const sum = trimmed.reduce((a, b) => a + b, 0)
  return Math.round(sum / trimmed.length)
}

export function computeErr(subscribers: number, avgViews: number): number | null {
  if (subscribers <= 0 || avgViews <= 0) return null
  return Math.round((avgViews / subscribers) * 1000) / 10
}

export function computeErr24(subscribers: number, avgViews24h: number): number | null {
  if (subscribers <= 0 || avgViews24h <= 0) return null
  return Math.round((avgViews24h / subscribers) * 1000) / 10
}

export function computeCpm(adPrice: number, avgViews: number): number | null {
  if (adPrice <= 0 || avgViews <= 0) return null
  return Math.round((adPrice / avgViews) * 1000 * 100) / 100
}

export function computeCpm24(adPrice: number, avgViews24h: number): number | null {
  if (adPrice <= 0 || avgViews24h <= 0) return null
  return Math.round((adPrice / avgViews24h) * 1000 * 100) / 100
}

export function aggregatePostViews(posts: PostViewInput[]): {
  avgViews: number | null
  avgViews24h: number | null
  eligibleCount: number
  eligible24hCount: number
} {
  const recent = posts.slice(0, ANALYTICS_MAX_POSTS)
  const viewValues = recent
    .map((p) => p.views)
    .filter((v): v is number => typeof v === 'number' && v > 0)
  const view24Values = recent
    .map((p) => p.views24h)
    .filter((v): v is number => typeof v === 'number' && v > 0)

  return {
    avgViews: trimmedAverage(viewValues),
    avgViews24h: trimmedAverage(view24Values),
    eligibleCount: viewValues.length,
    eligible24hCount: view24Values.length,
  }
}

export type AnalyticsCollectionState =
  | { status: 'disconnected' }
  | { status: 'connected'; postsTracked: number }
  | { status: 'collecting'; postsTracked: number; minPosts: number }
  | { status: 'active'; postsTracked: number }

export function getAnalyticsCollectionState(input: {
  analyticsStatus: string | null | undefined
  postsTracked: number
  hasViewMetrics: boolean
}): AnalyticsCollectionState {
  const postsTracked = Math.max(0, input.postsTracked)
  const status = input.analyticsStatus || 'disconnected'

  if (status === 'disconnected') return { status: 'disconnected' }
  if (status === 'connected' && postsTracked === 0) {
    return { status: 'connected', postsTracked: 0 }
  }

  if (!input.hasViewMetrics || postsTracked < ANALYTICS_MIN_POSTS) {
    return {
      status: 'collecting',
      postsTracked,
      minPosts: ANALYTICS_MIN_POSTS,
    }
  }

  return { status: 'active', postsTracked }
}

export function formatMetricPercent(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null
  return `${Math.round(value * 10) / 10}%`
}

/** Compact count: 1234 → 1.2K, 25400 → 25.4K, 1400000 → 1.4M. Null stays null. */
export function formatCompactNumber(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000
    if (scaled >= 100) return `${Math.round(scaled)}M`
    return `${Math.round(scaled * 10) / 10}M`
  }
  if (value >= 1000) {
    const scaled = value / 1000
    if (scaled >= 100) return `${Math.round(scaled)}K`
    return `${Math.round(scaled * 10) / 10}K`
  }
  return String(Math.round(value))
}

export function formatMetricCpm(value: number | null, currency = ''): string | null {
  if (value === null || !Number.isFinite(value)) return null
  return currency ? `${currency}${value.toFixed(2)}` : value.toFixed(2)
}

export function errMetric(subscribers: number, avgViews: number | null): MetricValue {
  if (avgViews === null || avgViews <= 0) return { kind: 'missing' }
  const err = computeErr(subscribers, avgViews)
  return err !== null ? { kind: 'value', value: err } : { kind: 'missing' }
}

export function err24Metric(subscribers: number, avgViews24h: number | null, eligible24hCount: number): MetricValue {
  if (eligible24hCount < 1 || avgViews24h === null || avgViews24h <= 0) {
    return { kind: 'collecting', label: 'Collecting data' }
  }
  const err24 = computeErr24(subscribers, avgViews24h)
  return err24 !== null ? { kind: 'value', value: err24 } : { kind: 'missing' }
}
