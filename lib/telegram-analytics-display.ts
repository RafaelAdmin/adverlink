import {
  convertMoneyAmount,
  formatDisplayCpmValue,
  formatDisplayMoney,
  type MoneyDisplayContext,
} from '@/lib/currency'
import {
  computeCpm,
  computeCpm24,
  computeErr,
  computeErr24,
  formatCompactNumber,
  formatMetricPercent,
} from '@/lib/telegram-analytics'

export type { MoneyDisplayContext } from '@/lib/currency'

export type ChannelAnalyticsFields = {
  platform?: string | null
  subscriber_count?: number | null
  avg_views?: number | null
  ad_price?: number | null
  ad_price_currency?: string | null
  analytics_status?: string | null
  analytics_posts_tracked?: number | null
  analytics_avg_views_24h?: number | null
  analytics_err24_eligible_count?: number | null
  analytics_last_sync_at?: string | null
}

export type MarketplaceMetricCell = {
  value: string
  label: string
  metricLabel: string
}

export type AnalyticsMetricRow = {
  label: string
  value: string
  hint?: string | null
  tooltip?: string
}

export type ChannelAnalyticsSection = {
  title: string
  rows: AnalyticsMetricRow[]
}

export const ANALYTICS_TOOLTIPS = {
  averageViews: 'Среднее число просмотров по отслеживаемым недавним постам Telegram.',
  err: 'Average Views / Subscribers × 100.',
  averageViews24h:
    'Среднее число просмотров, которое отслеживаемый пост набирает примерно за 24 часа.',
  err24: '24h Average Views / Subscribers × 100.',
  cpm: 'Оценочная стоимость рекламы за 1 000 средних просмотров.',
  cpm24:
    'Оценочная стоимость рекламы за 1 000 просмотров, достигнутых примерно за 24 часа.',
} as const

const MISSING = '—'
const WAITING_24H = 'Ожидание данных 24ч постов'
const SAMPLE_WARNING =
  'Сбор данных — метрики станут точнее после отслеживания большего числа постов.'

export function isOptionalAnalyticsConnected(status?: string | null): boolean {
  return status === 'connected' || status === 'collecting' || status === 'active'
}

export function isAnalyticsDisconnected(status?: string | null): boolean {
  return !status || status === 'disconnected'
}

export function isAnalyticsError(status?: string | null): boolean {
  return status === 'error'
}

export function getAnalyticsStatusUserLabel(status?: string | null): string {
  switch (status) {
    case 'connected':
    case 'collecting':
      return 'Сбор аналитики'
    case 'active':
      return 'Аналитика активна'
    case 'error':
      return 'Аналитика временно недоступна'
    case 'disconnected':
    default:
      return 'Автоаналитика постов не подключена'
  }
}

function positiveSubscribers(subscribers?: number | null): number | null {
  if (subscribers == null || subscribers <= 0) return null
  return subscribers
}

function formatViewsDisplay(views: number | null | undefined): string {
  if (views == null || views <= 0) return MISSING
  return formatCompactNumber(views) ?? views.toLocaleString()
}

function computeDisplayCpmValue(
  adPrice: number | null | undefined,
  sourceCurrency: string | null | undefined,
  avgViews: number | null | undefined,
  display: MoneyDisplayContext,
): number | null {
  if (avgViews == null || avgViews <= 0) return null
  const converted = convertMoneyAmount(
    adPrice,
    sourceCurrency,
    display.displayCurrency,
    display.rates,
  )
  if (converted === null) return null
  return computeCpm(converted, avgViews)
}

function computeDisplayCpm24Value(
  adPrice: number | null | undefined,
  sourceCurrency: string | null | undefined,
  avgViews24h: number | null | undefined,
  eligibleCount: number,
  display: MoneyDisplayContext,
): number | null {
  if (eligibleCount < 1 || avgViews24h == null || avgViews24h <= 0) return null
  const converted = convertMoneyAmount(
    adPrice,
    sourceCurrency,
    display.displayCurrency,
    display.rates,
  )
  if (converted === null) return null
  return computeCpm24(converted, avgViews24h)
}

function formatDisplayCpm(
  adPrice: number | null | undefined,
  sourceCurrency: string | null | undefined,
  avgViews: number | null | undefined,
  display: MoneyDisplayContext,
): string {
  const value = computeDisplayCpmValue(adPrice, sourceCurrency, avgViews, display)
  return formatDisplayCpmValue(value, display.displayCurrency)
}

function formatDisplayCpm24(
  adPrice: number | null | undefined,
  sourceCurrency: string | null | undefined,
  avgViews24h: number | null | undefined,
  eligibleCount: number,
  display: MoneyDisplayContext,
): { value: string; hint: string | null } {
  if (eligibleCount < 1 || avgViews24h == null || avgViews24h <= 0) {
    return { value: MISSING, hint: WAITING_24H }
  }
  if (adPrice == null || adPrice <= 0) {
    return { value: MISSING, hint: null }
  }
  const cpm = computeDisplayCpm24Value(
    adPrice,
    sourceCurrency,
    avgViews24h,
    eligibleCount,
    display,
  )
  if (cpm === null) {
    return { value: MISSING, hint: null }
  }
  return {
    value: formatDisplayCpmValue(cpm, display.displayCurrency),
    hint: null,
  }
}

export function formatCpmDisplay(
  adPrice: number | null | undefined,
  avgViews: number | null | undefined,
  display: MoneyDisplayContext,
  sourceCurrency?: string | null,
): string {
  return formatDisplayCpm(adPrice, sourceCurrency, avgViews, display)
}

export function formatErrDisplay(
  subscribers: number | null | undefined,
  avgViews: number | null | undefined,
): string {
  const subs = positiveSubscribers(subscribers)
  if (subs === null || avgViews == null || avgViews <= 0) return MISSING
  return formatMetricPercent(computeErr(subs, avgViews)) ?? MISSING
}

export function formatErr24Display(
  subscribers: number | null | undefined,
  avgViews24h: number | null | undefined,
  eligibleCount: number,
): { value: string; hint: string | null } {
  if (eligibleCount < 1 || avgViews24h == null || avgViews24h <= 0) {
    return { value: MISSING, hint: WAITING_24H }
  }
  const subs = positiveSubscribers(subscribers)
  if (subs === null) return { value: MISSING, hint: null }
  const err24 = computeErr24(subs, avgViews24h)
  return {
    value: formatMetricPercent(err24) ?? MISSING,
    hint: null,
  }
}

export function formatCpm24Display(
  adPrice: number | null | undefined,
  avgViews24h: number | null | undefined,
  eligibleCount: number,
  display: MoneyDisplayContext,
  sourceCurrency?: string | null,
): { value: string; hint: string | null } {
  return formatDisplayCpm24(adPrice, sourceCurrency, avgViews24h, eligibleCount, display)
}

export function getMarketplaceMetrics(
  channel: ChannelAnalyticsFields,
  display: MoneyDisplayContext,
): {
  subscribers: MarketplaceMetricCell
  engagement: MarketplaceMetricCell
  price: MarketplaceMetricCell
} {
  const subs = positiveSubscribers(channel.subscriber_count)
  const avgViews = channel.avg_views
  const avgViews24h = channel.analytics_avg_views_24h
  const eligible24h = channel.analytics_err24_eligible_count ?? 0
  const adPrice = channel.ad_price
  const sourceCurrency = channel.ad_price_currency

  const subscribers: MarketplaceMetricCell = {
    value: subs !== null ? (formatCompactNumber(subs) ?? String(subs)) : MISSING,
    label: 'подписчиков',
    metricLabel: 'подписчиков',
  }

  const err24 =
    subs !== null && eligible24h >= 1 && avgViews24h != null && avgViews24h > 0
      ? computeErr24(subs, avgViews24h)
      : null
  const err =
    subs !== null && avgViews != null && avgViews > 0 ? computeErr(subs, avgViews) : null

  const engagement: MarketplaceMetricCell =
    err24 !== null
      ? {
          value: formatMetricPercent(err24) ?? MISSING,
          label: 'ERR24',
          metricLabel: 'ERR24',
        }
      : err !== null
        ? {
            value: formatMetricPercent(err) ?? MISSING,
            label: 'ERR',
            metricLabel: 'ERR',
          }
        : {
            value: MISSING,
            label: 'ERR24',
            metricLabel: 'ERR24',
          }

  const cpm24 = computeDisplayCpm24Value(
    adPrice,
    sourceCurrency,
    avgViews24h,
    eligible24h,
    display,
  )
  const cpm = computeDisplayCpmValue(adPrice, sourceCurrency, avgViews, display)

  const price: MarketplaceMetricCell =
    cpm24 !== null
      ? {
          value: formatDisplayCpmValue(cpm24, display.displayCurrency),
          label: 'CPM24',
          metricLabel: 'CPM24',
        }
      : cpm !== null
        ? {
            value: formatDisplayCpmValue(cpm, display.displayCurrency),
            label: 'CPM',
            metricLabel: 'CPM',
          }
        : {
            value: MISSING,
            label: 'CPM24',
            metricLabel: 'CPM24',
          }

  return { subscribers, engagement, price }
}

export function buildTelegramChannelAnalytics(
  channel: ChannelAnalyticsFields & {
    ad_price?: number | null
    ad_price_currency?: string | null
    analytics_last_sync_at?: string | null
  },
  display: MoneyDisplayContext,
): {
  sections: ChannelAnalyticsSection[]
  sampleSizeWarning: string | null
} {
  const postsTracked = channel.analytics_posts_tracked ?? 0
  const eligible24h = channel.analytics_err24_eligible_count ?? 0
  const err24 = formatErr24Display(
    channel.subscriber_count,
    channel.analytics_avg_views_24h,
    eligible24h,
  )
  const cpm24 = formatDisplayCpm24(
    channel.ad_price,
    channel.ad_price_currency,
    channel.analytics_avg_views_24h,
    eligible24h,
    display,
  )

  const adPriceDisplay =
    channel.ad_price != null && channel.ad_price > 0
      ? formatDisplayMoney(
          channel.ad_price,
          channel.ad_price_currency || 'USD',
          display.displayCurrency,
          display.rates,
        )
      : MISSING

  const sections: ChannelAnalyticsSection[] = [
    {
      title: 'Аудитория',
      rows: [
        {
          label: 'Подписчики',
          value:
            positiveSubscribers(channel.subscriber_count) !== null
              ? (formatCompactNumber(channel.subscriber_count!) ??
                channel.subscriber_count!.toLocaleString())
              : MISSING,
        },
      ],
    },
    {
      title: 'Эффективность',
      rows: [
        {
          label: 'Average Views',
          value: formatViewsDisplay(channel.avg_views),
          tooltip: ANALYTICS_TOOLTIPS.averageViews,
        },
        {
          label: 'ERR',
          value: formatErrDisplay(channel.subscriber_count, channel.avg_views),
          tooltip: ANALYTICS_TOOLTIPS.err,
        },
        {
          label: '24h Average Views',
          value: formatViewsDisplay(channel.analytics_avg_views_24h),
          tooltip: ANALYTICS_TOOLTIPS.averageViews24h,
          hint: eligible24h < 1 ? WAITING_24H : null,
        },
        {
          label: 'ERR24',
          value: err24.value,
          hint: err24.hint,
          tooltip: ANALYTICS_TOOLTIPS.err24,
        },
      ],
    },
    {
      title: 'Рекламная эффективность',
      rows: [
        {
          label: 'Цена рекламы',
          value: adPriceDisplay,
        },
        {
          label: 'CPM',
          value: formatDisplayCpm(
            channel.ad_price,
            channel.ad_price_currency,
            channel.avg_views,
            display,
          ),
          tooltip: ANALYTICS_TOOLTIPS.cpm,
        },
        {
          label: 'CPM24',
          value: cpm24.value,
          hint: cpm24.hint,
          tooltip: ANALYTICS_TOOLTIPS.cpm24,
        },
      ],
    },
    {
      title: 'Качество данных',
      rows: [
        {
          label: 'Tracked Posts',
          value: String(postsTracked),
        },
        {
          label: '24h Sample',
          value: `${eligible24h} posts`,
        },
        {
          label: 'Статус аналитики',
          value: getAnalyticsStatusUserLabel(channel.analytics_status),
        },
        ...(channel.analytics_last_sync_at
          ? [
              {
                label: 'Последнее обновление',
                value: new Date(channel.analytics_last_sync_at).toLocaleString('ru-RU'),
              },
            ]
          : []),
      ],
    },
  ]

  return {
    sections,
    sampleSizeWarning: postsTracked < 3 ? SAMPLE_WARNING : null,
  }
}

/** @deprecated Use getAnalyticsStatusUserLabel */
export function getAnalyticsStatusLabel(channel: ChannelAnalyticsFields): string | null {
  if (isAnalyticsDisconnected(channel.analytics_status) && !isAnalyticsError(channel.analytics_status)) {
    return getAnalyticsStatusUserLabel('disconnected')
  }
  if (isAnalyticsError(channel.analytics_status)) {
    return getAnalyticsStatusUserLabel('error')
  }
  if (isOptionalAnalyticsConnected(channel.analytics_status)) {
    return getAnalyticsStatusUserLabel(channel.analytics_status)
  }
  return null
}

export function formatAnalyticsMetricLabel(
  analyticsStatus: string | null | undefined,
  hasManualViews: boolean,
): string {
  if (isAnalyticsDisconnected(analyticsStatus) && !hasManualViews) {
    return MISSING
  }
  return MISSING
}
