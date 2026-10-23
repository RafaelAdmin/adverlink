'use client'

import Link from 'next/link'
import { getPlatformColor, getPlatformIcon, getPlatformLabel } from '@/lib/channel-helpers'
import { formatLandingCount, type LandingPublicChannel } from '@/lib/landing-channels'
import { LANDING_DEMO_CHANNELS } from '@/lib/landing-demo-channels'

function LandingChannelCard({ channel }: { channel: LandingPublicChannel }) {
  const platform = channel.platform || 'telegram'
  const color = getPlatformColor(platform)
  const letter = channel.name[0]?.toUpperCase() || '?'

  return (
    <Link href="/marketplace" className="landing-channel-card" aria-label={`${channel.name}: открыть маркетплейс`}>
      <div className="landing-channel-card__header">
        {channel.avatarUrl ? (
          <img
            src={channel.avatarUrl}
            alt=""
            className="landing-channel-card__avatar-img"
          />
        ) : (
          <div className="landing-channel-card__avatar" aria-hidden>
            {letter}
          </div>
        )}
        <div className="landing-channel-card__title-wrap">
          <div className="landing-channel-card__name-row">
            <div className="landing-channel-card__name">{channel.name}</div>
            {channel.verified ? (
              <span className="landing-channel-card__verified" title="Верифицирован">
                ✓
              </span>
            ) : null}
          </div>
          {channel.handle ? <div className="landing-channel-card__handle">{channel.handle}</div> : null}
          <span className="landing-channel-card__platform" style={{ borderColor: `${color}44`, color }}>
            <i className={`ti ${getPlatformIcon(platform)}`} aria-hidden />
            {getPlatformLabel(platform)}
          </span>
        </div>
      </div>

      <div className="landing-channel-card__stats">
        <div>
          <strong>{formatLandingCount(channel.subscribers)}</strong>
          <span>подписчиков</span>
        </div>
        <div>
          <strong>{formatLandingCount(channel.avgViews)}</strong>
          <span>охваты</span>
        </div>
        <div>
          <strong>{channel.engagementLabel || '—'}</strong>
          <span>ER</span>
        </div>
      </div>

      <div className="landing-channel-card__footer">
        <span className="landing-channel-card__price">{channel.priceLabel}</span>
        <span className="landing-channel-card__cta">
          Запросить рекламу
        </span>
      </div>
    </Link>
  )
}

function CarouselColumn({
  channels,
  direction,
}: {
  channels: LandingPublicChannel[]
  direction: 'up' | 'down'
}) {
  const canLoop = channels.length >= 2
  const loop = canLoop ? [...channels, ...channels] : channels

  return (
    <div className="landing-carousel-column">
      <div
        className={`landing-carousel-track${
          canLoop ? ` landing-carousel-track--${direction}` : ' landing-carousel-track--static'
        }`}
      >
        {loop.map((channel, index) => (
          <LandingChannelCard key={`${channel.id}-${index}`} channel={channel} />
        ))}
      </div>
    </div>
  )
}

export default function HeroChannelCarousel() {
  const channels = LANDING_DEMO_CHANNELS
  const useTwoColumns = channels.length >= 2
  const left = useTwoColumns ? channels.filter((_, index) => index % 2 === 0) : channels
  const right = useTwoColumns ? channels.filter((_, index) => index % 2 === 1) : []
  const mobileCards = channels.slice(0, 4)

  return (
    <div className="landing-hero-carousel-wrap">
      <p className="landing-hero-carousel-label">Пример карточек каналов</p>
      <div
        className={`landing-hero-carousel landing-hero-carousel--desktop${useTwoColumns ? ' landing-hero-carousel--two' : ' landing-hero-carousel--one'}`}
        aria-label="Пример карточек каналов AdverLink"
      >
        <CarouselColumn channels={left} direction="down" />
        {useTwoColumns && right.length > 0 ? <CarouselColumn channels={right} direction="up" /> : null}
      </div>
      <div className="landing-hero-carousel landing-hero-carousel--mobile" aria-label="Пример карточек каналов AdverLink">
        {mobileCards.map((channel) => (
          <LandingChannelCard key={channel.id} channel={channel} />
        ))}
      </div>
    </div>
  )
}
