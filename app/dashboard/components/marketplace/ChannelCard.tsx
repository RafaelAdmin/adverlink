'use client'

import Link from 'next/link'
import type { Channel } from '@/lib/database.types'
import { CurrencyCode, formatConvertedPrice } from '@/lib/currency'
import { getChannelHandle } from '@/lib/channel-helpers'
import PlatformBadge from '../PlatformBadge'
import VerifiedBadge from '../VerifiedBadge'
import ChannelAvatar from './ChannelAvatar'

export default function ChannelCard({
  channel,
  displayCurrency,
  rates,
  myChannelIds,
}: {
  channel: Channel
  displayCurrency: CurrencyCode
  rates: Record<string, number>
  myChannelIds: string[]
}) {
  const convertChannelPrice = (price: number, fromCurrency: string = 'USD'): string =>
    formatConvertedPrice(price, fromCurrency, displayCurrency, rates, 'По запросу')

  return (
    <Link
      key={channel.id}
      href={`/dashboard/channel/${channel.id}`}
      className="hover-border-accent transition cursor-pointer"
      style={{ height: '100%', display: 'block' }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: '260px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexShrink: 0 }}>
          <ChannelAvatar channel={channel} />
          <PlatformBadge platform={channel.platform} />
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold truncate">{channel.name}</div>
            <div className="text-white/40 text-sm truncate">{getChannelHandle(channel)}</div>
          </div>
          {(channel.is_verified || channel.verification_status === 'verified') && (
            <VerifiedBadge gradId={`verifiedGrad-card-${channel.id}`} />
          )}
        </div>

        {channel.description ? (
          <p
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              marginBottom: '12px',
              flexShrink: 0,
              height: '40px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.5',
            }}
          >
            {channel.description}
          </p>
        ) : (
          <div style={{ height: '40px', flexShrink: 0 }} />
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '12px',
            flexShrink: 0,
          }}
        >
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-white text-sm font-semibold">
              {channel.subscriber_count >= 1000 ? `${(channel.subscriber_count / 1000).toFixed(1)}K` : channel.subscriber_count}
            </div>
            <div className="text-white/40 text-xs">подписчиков</div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-white text-sm font-semibold">
              {channel.avg_views >= 1000 ? `${(channel.avg_views / 1000).toFixed(1)}K` : channel.avg_views}
            </div>
            <div className="text-white/40 text-xs">охваты</div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <div className="text-white text-sm font-semibold">{channel.engagement_rate || 0}%</div>
            <div className="text-white/40 text-xs">вовлечённость</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div className="text-price-accent">
            {channel.ad_price
              ? `от ${convertChannelPrice(channel.ad_price, channel.ad_price_currency || 'USD')}`
              : 'Цена по запросу'}
          </div>
          {myChannelIds.includes(channel.id) ? (
            <span
              style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.25)',
                padding: '6px 12px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
              }}
            >
              Ваш канал
            </span>
          ) : (
            <Link
              href={`/dashboard/add-channel/request-ad?channelId=${channel.id}`}
              onClick={(e) => e.stopPropagation()}
              className="btn-accent transition text-white px-4 py-1.5 rounded-full text-sm"
            >
              Запросить рекламу
            </Link>
          )}
        </div>
      </div>
    </Link>
  )
}
