import {
  computeCpm,
  computeCpm24,
  computeErr,
  computeErr24,
  getAnalyticsCollectionState,
  type MetricValue,
} from '@/lib/telegram-analytics'

export type ChannelAnalyticsFields = {
  platform?: string | null
  subscriber_count?: number | null
  avg_views?: number | null
  ad_price?: number | null
  analytics_status?: string | null
  analytics_posts_tracked?: number | null
  analytics_avg_views_24h?: number | null
  analytics_err24_eligible_count?: number | null
}

export type MarketplaceMetricCell = {
  value: string
  label: string
}

function formatSubs(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count)
}

function formatMetricCell(metric: MetricValue, formatter: (n: number) => string): MarketplaceMetricCell {
  if (metric.kind === 'value') {
    return { value: formatter(metric.value), label: '' }
  }
  if (metric.kind === 'collecting') {
    return { value: '—', label: metric.label || 'Сбор данных' }
  }
  return { value: '—', label: '' }
}

export type MarketplaceMetricsMode = 'err24' | 'err' | 'collecting' | 'unavailable'

export function isOptionalAnalyticsConnected(status?: string | null): boolean {
  return status === 'connected' || status === 'collecting' || status === 'active'
}

export function isAnalyticsDisconnected(status?: string | null): boolean {
  return !status || status === 'disconnected' || status === 'error'
}

export function getMarketplaceMetrics(channel: ChannelAnalyticsFields): {
  subscribers: MarketplaceMetricCell
  engagement: MarketplaceMetricCell & { metricLabel: string }
  price: MarketplaceMetricCell
  mode: MarketplaceMetricsMode
} {
  const subs = channel.subscriber_count ?? 0
  const avgViews = channel.avg_views ?? 0
  const avgViews24h = channel.analytics_avg_views_24h ?? null
  const eligible24h = channel.analytics_err24_eligible_count ?? 0
  const adPrice = channel.ad_price ?? 0
  const postsTracked = channel.analytics_posts_tracked ?? 0
  const analyticsConnected = isOptionalAnalyticsConnected(channel.analytics_status)
  const hasViewMetrics = avgViews > 0

  const subscribers: MarketplaceMetricCell = {
    value: formatSubs(subs),
    label: 'подписчиков',
  }

  const err24 =
    eligible24h >= 1 && avgViews24h !== null && avgViews24h > 0
      ? computeErr24(subs, avgViews24h)
      : null
  const err = avgViews > 0 ? computeErr(subs, avgViews) : null

  if (err24 !== null && adPrice > 0) {
    const cpm24 = computeCpm24(adPrice, avgViews24h!)
    return {
      subscribers,
      engagement: {
        value: `${err24}%`,
        label: 'ERR24',
        metricLabel: 'ERR24',
      },
      price: {
        value: cpm24 !== null ? `$${cpm24.toFixed(0)}` : '—',
        label: 'CPM24',
      },
      mode: 'err24',
    }
  }

  if (err !== null && adPrice > 0) {
    const cpm = computeCpm(adPrice, avgViews)
    return {
      subscribers,
      engagement: {
        value: `${err}%`,
        label: 'ERR',
        metricLabel: 'ERR',
      },
      price: {
        value: cpm !== null ? `$${cpm.toFixed(0)}` : '—',
        label: 'CPM',
      },
      mode: 'err',
    }
  }

  if (err !== null) {
    return {
      subscribers,
      engagement: {
        value: `${err}%`,
        label: 'ERR',
        metricLabel: 'ERR',
      },
      price: {
        value: '—',
        label: 'CPM',
      },
      mode: 'err',
    }
  }

  if (analyticsConnected) {
    const collection = getAnalyticsCollectionState({
      analyticsStatus: channel.analytics_status,
      postsTracked,
      hasViewMetrics,
    })
    const collectingLabel =
      collection.status === 'collecting'
        ? `${collection.postsTracked}/${collection.minPosts}`
        : collection.status === 'connected'
          ? '0'
          : '—'

    return {
      subscribers,
      engagement: {
        value: collectingLabel,
        label: 'аналитика',
        metricLabel: 'Сбор данных',
      },
      price: {
        value: '—',
        label: 'CPM',
      },
      mode: 'collecting',
    }
  }

  return {
    subscribers,
    engagement: {
      value: '—',
      label: 'Нет данных',
      metricLabel: 'Аналитика',
    },
    price: {
      value: '—',
      label: 'аналитика',
    },
    mode: 'unavailable',
  }
}

export function getAnalyticsStatusLabel(channel: ChannelAnalyticsFields): string | null {
  if (isAnalyticsDisconnected(channel.analytics_status)) {
    return null
  }

  const postsTracked = channel.analytics_posts_tracked ?? 0
  const hasViewMetrics = (channel.avg_views ?? 0) > 0
  const state = getAnalyticsCollectionState({
    analyticsStatus: channel.analytics_status,
    postsTracked,
    hasViewMetrics,
  })

  switch (state.status) {
    case 'connected':
      return 'Автоаналитика подключена — ожидаем новые посты'
    case 'collecting':
      return `Сбор автоаналитики: ${state.postsTracked} / ${state.minPosts} постов`
    case 'active':
      return 'Автоаналитика активна'
    default:
      return null
  }
}

export function formatAnalyticsMetricLabel(
  analyticsStatus: string | null | undefined,
  hasManualViews: boolean,
): string {
  if (isAnalyticsDisconnected(analyticsStatus) && !hasManualViews) {
    return 'Нет данных'
  }
  return '—'
}

export function formatErrDisplay(
  subscribers: number,
  avgViews: number | null,
): string {
  if (avgViews === null || avgViews <= 0) return '—'
  const err = computeErr(subscribers, avgViews)
  return err !== null ? `${err}%` : '—'
}

export function formatErr24Display(
  subscribers: number,
  avgViews24h: number | null,
  eligibleCount: number,
  analyticsStatus?: string | null,
): string {
  if (isAnalyticsDisconnected(analyticsStatus)) {
    return 'Нет данных'
  }
  if (eligibleCount < 1 || avgViews24h === null || avgViews24h <= 0) return 'Сбор данных'
  const err24 = computeErr24(subscribers, avgViews24h)
  return err24 !== null ? `${err24}%` : '—'
}
