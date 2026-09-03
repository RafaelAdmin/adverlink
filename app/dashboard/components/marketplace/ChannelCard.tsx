'use client'

import Link from 'next/link'
import type { Channel } from '@/lib/database.types'
import { CurrencyCode, formatConvertedPrice } from '@/lib/currency'
import { getChannelHandle } from '@/lib/channel-helpers'
import PlatformBadge from '../PlatformBadge'
import VerifiedBadge from '../VerifiedBadge'
import ChannelAvatar from './ChannelAvatar'
import { formatEngagementRate } from '@/lib/channel-metrics'
import { getMarketplaceMetrics } from '@/lib/telegram-analytics-display'

export default function ChannelCard({
  channel,
  displayCurrency,
  rates,
  myChannelIds,
}: {
  channel: Channel & { owner_profile?: { subscription_plan?: string; is_admin?: boolean } | null }
  displayCurrency: CurrencyCode
  rates: Record<string, number>
  myChannelIds: string[]
}) {
  const convertChannelPrice = (price: number, fromCurrency: string = 'USD'): string =>
    formatConvertedPrice(price, fromCurrency, displayCurrency, rates, 'По запросу')

  const isTelegram = channel.platform === 'telegram' || !channel.platform
  const marketplaceMetrics = isTelegram
    ? getMarketplaceMetrics(channel, { displayCurrency, rates })
    : null
  const engagementLabel = marketplaceMetrics
    ? null
    : formatEngagementRate(channel.subscriber_count, channel.avg_views)

  const priceLabel = channel.ad_price
    ? `от ${convertChannelPrice(channel.ad_price, channel.ad_price_currency || 'USD')}`
    : 'Цена по запросу'

  const isOwn = myChannelIds.includes(channel.id)

  return (
    <Link href={`/dashboard/channel/${channel.id}`} className="ui-listing-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
        <ChannelAvatar channel={channel} />
        <div className="flex-1 min-w-0">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="ui-card-title truncate">{channel.name}</span>
            {(channel.is_verified || channel.verification_status === 'verified') && (
              <VerifiedBadge gradId={`verifiedGrad-card-${channel.id}`} />
            )}
            {(channel.owner_profile?.subscription_plan === 'pro' || channel.owner_profile?.is_admin === true) && (
              <span className="ui-meta" style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-pill)', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.35)', color: '#ca8a04' }}>
                PRO
              </span>
            )}
          </div>
          <div className="ui-meta truncate">{getChannelHandle(channel)}</div>
          <div style={{ marginTop: '4px' }}>
            <PlatformBadge platform={channel.platform} />
          </div>
        </div>
      </div>

      {channel.description ? (
        <p className="ui-meta" style={{ marginBottom: '10px', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.6em' }}>
          {channel.description}
        </p>
      ) : (
        <div style={{ minHeight: '2.6em', marginBottom: '10px' }} />
      )}

      <div className="ui-listing-card__metrics">
        <div className="ui-listing-card__metric">
          <div className="ui-listing-card__metric-value">
            {marketplaceMetrics
              ? marketplaceMetrics.subscribers.value
              : channel.subscriber_count >= 1000
                ? `${(channel.subscriber_count / 1000).toFixed(1)}K`
                : channel.subscriber_count}
          </div>
          <div className="ui-listing-card__metric-label">
            {marketplaceMetrics ? marketplaceMetrics.subscribers.metricLabel : 'подписчиков'}
          </div>
        </div>
        <div className="ui-listing-card__metric">
          {marketplaceMetrics ? (
            <>
              <div className={`ui-listing-card__metric-value ${marketplaceMetrics.engagement.value === '—' ? 'ui-listing-card__metric-value--muted' : ''}`}>
                {marketplaceMetrics.engagement.value}
              </div>
              <div className="ui-listing-card__metric-label">{marketplaceMetrics.engagement.metricLabel}</div>
            </>
          ) : channel.avg_views != null && channel.avg_views > 0 ? (
            <>
              <div className="ui-listing-card__metric-value">
                {channel.avg_views >= 1000 ? `${(channel.avg_views / 1000).toFixed(1)}K` : channel.avg_views}
              </div>
              <div className="ui-listing-card__metric-label">охваты</div>
            </>
          ) : engagementLabel ? (
            <>
              <div className="ui-listing-card__metric-value">{engagementLabel}</div>
              <div className="ui-listing-card__metric-label">ER</div>
            </>
          ) : (
            <>
              <div className="ui-listing-card__metric-value ui-listing-card__metric-value--muted">—</div>
              <div className="ui-listing-card__metric-label">ER</div>
            </>
          )}
        </div>
        <div className="ui-listing-card__metric">
          {marketplaceMetrics ? (
            <>
              <div className={`ui-listing-card__metric-value ${marketplaceMetrics.price.value === '—' ? 'ui-listing-card__metric-value--muted' : ''}`}>
                {marketplaceMetrics.price.value}
              </div>
              <div className="ui-listing-card__metric-label">{marketplaceMetrics.price.metricLabel}</div>
            </>
          ) : (
            <>
              <div className="ui-listing-card__metric-value ui-listing-card__metric-value--muted">—</div>
              <div className="ui-listing-card__metric-label">CPM</div>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="ui-listing-card__price">{priceLabel}</div>
        {isOwn ? (
          <span className="ui-meta" style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            Ваш канал
          </span>
        ) : (
          <span className="ui-btn ui-btn--primary ui-btn--sm" style={{ pointerEvents: 'none' }}>
            Запросить рекламу
          </span>
        )}
      </div>
    </Link>
  )
}
