'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getPlatformColor, getPlatformIcon, getPlatformLabel } from '@/lib/channel-helpers'
import ChannelAvatar from '@/app/dashboard/components/marketplace/ChannelAvatar'
import VerifiedBadge from '@/app/dashboard/components/VerifiedBadge'
import { PublicSiteHeader } from '@/app/marketplace/PublicCatalog'
import {
  PUBLIC_CATEGORY_SELECT,
  PUBLIC_CHANNEL_SELECT,
  PUBLIC_CHANNELS_VIEW,
  isPublicChannelId,
  publicCountryLabel,
  publicLanguageLabel,
  requestAdHref,
  toPublicChannel,
  type PublicCategory,
  type PublicChannel,
  type PublicChannelRow,
} from '@/lib/public-marketplace'

export default function PublicChannelView() {
  const params = useParams<{ id: string }>()
  const channelId = typeof params?.id === 'string' ? params.id : ''
  const idIsValid = isPublicChannelId(channelId)
  const [channel, setChannel] = useState<PublicChannel | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>(idIsValid ? 'loading' : 'missing')
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    if (!idIsValid) return
    const supabase = createClient()
    let cancelled = false

    const load = async () => {
      const [{ data, error }, categoriesResult, userResult] = await Promise.all([
        supabase.from(PUBLIC_CHANNELS_VIEW).select(PUBLIC_CHANNEL_SELECT).eq('id', channelId).maybeSingle(),
        supabase.from('categories').select(PUBLIC_CATEGORY_SELECT),
        supabase.auth.getUser(),
      ])
      if (cancelled) return
      setAuthenticated(Boolean(userResult.data.user))
      if (error) {
        setState('error')
        return
      }
      const categories = ((categoriesResult.data || []) as PublicCategory[])
      const names = new Map(categories.map((category) => [category.id, category.name]))
      const row = data as PublicChannelRow | null
      const mapped = row ? toPublicChannel(row, row.category_id ? names.get(row.category_id) || null : null) : null
      setChannel(mapped)
      setState(mapped ? 'ready' : 'missing')
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [channelId, idIsValid])

  const requestHref = channel ? requestAdHref(channel.id, authenticated) : null
  const platform = channel?.platform || 'telegram'
  const color = getPlatformColor(platform)

  return (
    <div className="public-marketplace">
      <PublicSiteHeader authenticated={authenticated} />
      <main className="public-marketplace-main">
        <div className="landing-container public-channel-detail">
          <Link href="/marketplace" className="public-channel-back">
            ← Все каналы
          </Link>

          {state === 'loading' ? <p className="public-marketplace-status">Загрузка канала…</p> : null}
          {state === 'error' ? <p className="public-marketplace-status">Не удалось открыть канал. Обновите страницу.</p> : null}
          {state === 'missing' ? (
            <div className="public-marketplace-empty">
              <p>Этот канал не опубликован или его больше нет в каталоге.</p>
              <Link href="/marketplace" className="ui-btn ui-btn--primary ui-btn--sm">
                Вернуться в маркетплейс
              </Link>
            </div>
          ) : null}

          {channel && requestHref ? (
            <article className="ui-listing-card public-channel-detail__card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                <ChannelAvatar channel={{ name: channel.name, avatar_url: channel.avatarUrl }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h1 className="public-channel-detail__name">{channel.name}</h1>
                    {channel.verified ? <VerifiedBadge gradId={`verified-public-detail-${channel.id}`} /> : null}
                  </div>
                  {channel.handle ? <p className="ui-meta">{channel.handle}</p> : null}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '8px',
                      background: `${color}22`,
                      border: `1px solid ${color}44`,
                      borderRadius: '20px',
                      padding: '3px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#fff',
                    }}
                  >
                    <i className={`ti ${getPlatformIcon(platform)}`} style={{ color }} aria-hidden />
                    {getPlatformLabel(platform)}
                  </span>
                </div>
              </div>

              {channel.description ? <p className="public-channel-detail__description">{channel.description}</p> : null}

              <div className="ui-listing-card__metrics">
                <div className="ui-listing-card__metric">
                  <div className="ui-listing-card__metric-value">{channel.subscriberLabel}</div>
                  <div className="ui-listing-card__metric-label">подписчиков</div>
                </div>
                <div className="ui-listing-card__metric">
                  <div className="ui-listing-card__metric-value">{channel.viewsLabel}</div>
                  <div className="ui-listing-card__metric-label">охваты</div>
                </div>
                <div className="ui-listing-card__metric">
                  <div className={`ui-listing-card__metric-value${channel.engagementLabel ? '' : ' ui-listing-card__metric-value--muted'}`}>
                    {channel.engagementLabel || '—'}
                  </div>
                  <div className="ui-listing-card__metric-label">ER</div>
                </div>
              </div>

              <dl className="public-channel-facts">
                <div>
                  <dt>Цена</dt>
                  <dd>{channel.priceLabel}</dd>
                </div>
                {channel.categoryName ? (
                  <div>
                    <dt>Категория</dt>
                    <dd>{channel.categoryName}</dd>
                  </div>
                ) : null}
                {publicCountryLabel(channel.country) ? (
                  <div>
                    <dt>Страна</dt>
                    <dd>{publicCountryLabel(channel.country)}</dd>
                  </div>
                ) : null}
                {publicLanguageLabel(channel.language) ? (
                  <div>
                    <dt>Язык</dt>
                    <dd>{publicLanguageLabel(channel.language)}</dd>
                  </div>
                ) : null}
                {channel.ratingLabel ? (
                  <div>
                    <dt>Рейтинг</dt>
                    <dd>{channel.ratingLabel}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="public-channel-actions">
                <Link href={requestHref} className="ui-btn ui-btn--primary">
                  Запросить рекламу
                </Link>
                {channel.platformUrl ? (
                  <a href={channel.platformUrl} className="ui-btn ui-btn--secondary" target="_blank" rel="noopener noreferrer">
                    Открыть площадку
                  </a>
                ) : null}
              </div>
              <p className="ui-meta" style={{ marginTop: '14px' }}>
                {authenticated
                  ? 'Запрос откроет существующую форму заказа в кабинете.'
                  : 'Запрос откроет вход или регистрацию. После этого вы вернётесь к заказу на этот канал.'}
              </p>
            </article>
          ) : null}
        </div>
      </main>
    </div>
  )
}
