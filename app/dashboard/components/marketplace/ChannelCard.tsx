'use client'

import Link from 'next/link'
import { CurrencyCode, formatConvertedPrice } from '@/lib/currency'
import { getChannelHandle } from '@/lib/channel-helpers'
import PlatformBadge from '../PlatformBadge'
import ChannelAvatar from './ChannelAvatar'

export default function ChannelCard({
  channel,
  displayCurrency,
  rates,
  myChannelIds,
}: {
  channel: any
  displayCurrency: CurrencyCode
  rates: Record<string, number>
  myChannelIds: string[]
}) {
  const convertChannelPrice = (price: number, fromCurrency: string = 'USD'): string =>
    formatConvertedPrice(price, fromCurrency, displayCurrency, rates, 'По запросу')

  return (
    <Link key={channel.id} href={`/dashboard/channel/${channel.id}`} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover-border-accent transition cursor-pointer block">
      <div className="flex items-center gap-4 mb-4">
        <ChannelAvatar channel={channel} />
        <PlatformBadge platform={channel.platform} />
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold truncate">{channel.name}</div>
          <div className="text-white/40 text-sm truncate">{getChannelHandle(channel)}</div>
        </div>
        {(channel.is_verified || channel.verification_status === 'verified') && (
          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">✓</span>
        )}
      </div>
      {channel.description && <p className="text-white/50 text-sm mb-4 line-clamp-2">{channel.description}</p>}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-white text-sm font-semibold">{channel.subscriber_count >= 1000 ? `${(channel.subscriber_count / 1000).toFixed(1)}K` : channel.subscriber_count}</div>
          <div className="text-white/40 text-xs">подписчиков</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-white text-sm font-semibold">{channel.avg_views >= 1000 ? `${(channel.avg_views / 1000).toFixed(1)}K` : channel.avg_views}</div>
          <div className="text-white/40 text-xs">охваты</div>
        </div>
        <div className="bg-white/5 rounded-xl p-2 text-center">
          <div className="text-white text-sm font-semibold">{channel.engagement_rate || 0}%</div>
          <div className="text-white/40 text-xs">вовлечённость</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
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
    </Link>
  )
}
