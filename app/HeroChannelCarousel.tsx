'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getPlatformColor, getPlatformIcon, getPlatformLabel } from '@/lib/channel-helpers'
import {
  LANDING_CHANNELS_VIEW,
  LANDING_CHANNEL_SELECT,
  formatLandingCount,
  landingPublicChannelsFromRows,
  type LandingChannelRow,
  type LandingPublicChannel,
} from '@/lib/landing-channels'

function LandingChannelCard({ channel }: { channel: LandingPublicChannel }) {
  const platform = channel.platform || 'telegram'
  const color = getPlatformColor(platform)
  const letter = channel.name[0]?.toUpperCase() || '?'

  return (
    <article className="landing-channel-card">
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
        <Link href="/auth/login" className="landing-channel-card__cta">
          Запросить рекламу
        </Link>
      </div>
    </article>
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
  const [channels, setChannels] = useState<LandingPublicChannel[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const load = async () => {
      const { data, error } = await supabase
        .from(LANDING_CHANNELS_VIEW)
        .select(LANDING_CHANNEL_SELECT)

      if (cancelled) return
      if (error) {
        setChannels([])
        return
      }
      setChannels(landingPublicChannelsFromRows((data ?? []) as unknown as LandingChannelRow[]))
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (channels === null) {
    return (
      <div className="landing-hero-carousel-wrap">
        <p className="landing-hero-carousel-label">Каналы в маркетплейсе</p>
        <div className="landing-hero-carousel landing-hero-carousel--empty" aria-busy="true">
          <p className="landing-hero-carousel-empty">Загрузка каналов…</p>
        </div>
      </div>
    )
  }

  if (channels.length === 0) {
    return (
      <div className="landing-hero-carousel-wrap">
        <p className="landing-hero-carousel-label">Каналы в маркетплейсе</p>
        <div className="landing-hero-carousel landing-hero-carousel--empty">
          <p className="landing-hero-carousel-empty">
            Каталог каналов пока наполняется. Зарегистрируйтесь, чтобы добавить площадку или найти каналы позже.
          </p>
          <Link href="/auth/login" className="landing-btn landing-btn--accent landing-btn--sm">
            Войти
          </Link>
        </div>
      </div>
    )
  }

  const mobileCards = channels.slice(0, 4)

  return (
    <div className="landing-hero-carousel-wrap">
      <p className="landing-hero-carousel-label">Каналы в маркетплейсе</p>
      <div
        className="landing-hero-carousel landing-hero-carousel--desktop landing-hero-carousel--one"
        aria-label="Каналы в маркетплейсе AdverLink"
      >
        <CarouselColumn channels={channels} direction="down" />
      </div>
      <div className="landing-hero-carousel landing-hero-carousel--mobile" aria-label="Каналы в маркетплейсе AdverLink">
        {mobileCards.map((channel) => (
          <LandingChannelCard key={channel.id} channel={channel} />
        ))}
      </div>
    </div>
  )
}
