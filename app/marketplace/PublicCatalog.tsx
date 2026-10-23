'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getExchangeRates } from '@/lib/currency'
import { getPlatformColor, getPlatformIcon, getPlatformLabel } from '@/lib/channel-helpers'
import ChannelAvatar from '@/app/dashboard/components/marketplace/ChannelAvatar'
import VerifiedBadge from '@/app/dashboard/components/VerifiedBadge'
import {
  DEFAULT_PUBLIC_FILTERS,
  PUBLIC_CATEGORY_SELECT,
  PUBLIC_CHANNEL_SELECT,
  PUBLIC_CHANNELS_VIEW,
  PUBLIC_PLATFORM_OPTIONS,
  PUBLIC_PRICE_MAX,
  PUBLIC_SUBS_MAX,
  filterPublicChannels,
  mapPublicChannels,
  publicChannelPath,
  requestAdHref,
  type PublicCategory,
  type PublicChannel,
  type PublicChannelFilterState,
  type PublicChannelRow,
} from '@/lib/public-marketplace'

function PublicSiteHeader({ authenticated }: { authenticated: boolean }) {
  return (
    <header className="landing-navbar landing-navbar--scrolled">
      <div className="landing-container landing-navbar-inner">
        <Link href="/" className="landing-logo">
          Adver<span>Link</span>
        </Link>
        <div className="landing-nav-links">
          <Link href="/marketplace">Маркетплейс</Link>
          <Link href="/#how-it-works">Как это работает</Link>
        </div>
        <div className="landing-nav-actions">
          {authenticated ? (
            <Link href="/dashboard" className="landing-btn landing-btn--accent landing-btn--sm">
              Кабинет
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="landing-btn landing-btn--outline landing-btn--sm">
                Войти
              </Link>
              <Link href="/auth/login?next=%2Fmarketplace" className="landing-btn landing-btn--accent landing-btn--sm">
                Начать бесплатно
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function PublicChannelCard({
  channel,
  authenticated,
}: {
  channel: PublicChannel
  authenticated: boolean
}) {
  const viewHref = publicChannelPath(channel.id)
  const requestHref = requestAdHref(channel.id, authenticated)
  const platform = channel.platform || 'telegram'
  const color = getPlatformColor(platform)

  if (!viewHref || !requestHref) return null

  return (
    <article className="ui-listing-card public-channel-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
        <ChannelAvatar channel={{ name: channel.name, avatar_url: channel.avatarUrl }} />
        <div className="flex-1 min-w-0">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="ui-card-title truncate">{channel.name}</span>
            {channel.verified ? <VerifiedBadge gradId={`verified-public-${channel.id}`} /> : null}
          </div>
          {channel.handle ? <div className="ui-meta truncate">{channel.handle}</div> : null}
          <div style={{ marginTop: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: `${color}22`,
                border: `1px solid ${color}44`,
                borderRadius: '20px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 600,
                color: '#fff',
              }}
            >
              <i className={`ti ${getPlatformIcon(platform)}`} style={{ fontSize: '11px', color }} aria-hidden />
              {getPlatformLabel(platform)}
            </span>
          </div>
        </div>
      </div>

      {channel.description ? (
        <p className="ui-meta public-channel-card__description">{channel.description}</p>
      ) : (
        <div className="public-channel-card__description" />
      )}

      {channel.categoryName ? <div className="ui-meta public-channel-card__category">{channel.categoryName}</div> : null}

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

      <div style={{ flex: 1 }} />

      <div className="public-channel-card__footer">
        <div className="ui-listing-card__price">{channel.priceLabel}</div>
        <div className="public-channel-actions">
          <Link href={viewHref} className="ui-btn ui-btn--secondary ui-btn--sm">
            Посмотреть
          </Link>
          <Link href={requestHref} className="ui-btn ui-btn--primary ui-btn--sm">
            Запросить рекламу
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function PublicCatalog() {
  const [channels, setChannels] = useState<PublicChannel[] | null>(null)
  const [categories, setCategories] = useState<PublicCategory[]>([])
  const [error, setError] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [filters, setFilters] = useState<PublicChannelFilterState>(DEFAULT_PUBLIC_FILTERS)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const load = async () => {
      const [{ data, error: loadError }, categoriesResult, userResult] = await Promise.all([
        supabase.from(PUBLIC_CHANNELS_VIEW).select(PUBLIC_CHANNEL_SELECT),
        supabase.from('categories').select(PUBLIC_CATEGORY_SELECT).order('name'),
        supabase.auth.getUser(),
      ])

      if (cancelled) return
      setAuthenticated(Boolean(userResult.data.user))
      const categoryRows = (categoriesResult.data || []) as PublicCategory[]
      setCategories(categoryRows.filter((category) => category.id && category.name))
      if (loadError) {
        setError('Не удалось загрузить каталог. Обновите страницу.')
        setChannels([])
        return
      }
      setChannels(mapPublicChannels((data || []) as unknown as PublicChannelRow[], categoryRows))
    }

    void load()
    getExchangeRates().then(setRates).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(
    () => filterPublicChannels(channels || [], filters, rates),
    [channels, filters, rates],
  )

  const patch = (partial: Partial<PublicChannelFilterState>) => {
    setFilters((current) => ({ ...current, ...partial }))
  }

  return (
    <div className="public-marketplace">
      <PublicSiteHeader authenticated={authenticated} />
      <main className="public-marketplace-main">
        <div className="landing-container">
          <h1 className="public-marketplace-title">Маркетплейс каналов</h1>
          <p className="public-marketplace-lead">
            Реальные активные каналы можно смотреть без аккаунта. Чтобы отправить запрос на рекламу, войдите или зарегистрируйтесь — после этого вы вернётесь к выбранному каналу.
          </p>

          <label className="ui-field" style={{ marginBottom: '12px' }}>
            <span className="ui-field__label">Поиск</span>
            <input
              className="marketplace-search-input"
              value={filters.search}
              placeholder="Название или описание"
              onChange={(event) => patch({ search: event.target.value })}
            />
          </label>

          <div className="public-marketplace-filters">
            <label className="ui-field">
              <span className="ui-field__label">Платформа</span>
              <select
                className="ui-input"
                value={filters.platform}
                onChange={(event) => patch({ platform: event.target.value })}
              >
                {PUBLIC_PLATFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {categories.length > 0 ? (
              <label className="ui-field">
                <span className="ui-field__label">Категория</span>
                <select
                  className="ui-input"
                  value={filters.categoryId}
                  onChange={(event) => patch({ categoryId: event.target.value })}
                >
                  <option value="all">Все категории</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon ? `${category.icon} ` : ''}
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="ui-field">
              <span className="ui-field__label">Подписчики от</span>
              <input
                className="ui-input"
                type="number"
                min={0}
                max={PUBLIC_SUBS_MAX}
                value={filters.minSubs}
                onChange={(event) => patch({ minSubs: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Подписчики до</span>
              <input
                className="ui-input"
                type="number"
                min={0}
                max={PUBLIC_SUBS_MAX}
                value={filters.maxSubs}
                onChange={(event) => patch({ maxSubs: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Цена от, USD</span>
              <input
                className="ui-input"
                type="number"
                min={0}
                max={PUBLIC_PRICE_MAX}
                value={filters.minPrice}
                onChange={(event) => patch({ minPrice: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="ui-field">
              <span className="ui-field__label">Цена до, USD</span>
              <input
                className="ui-input"
                type="number"
                min={0}
                max={PUBLIC_PRICE_MAX}
                value={filters.maxPrice}
                onChange={(event) => patch({ maxPrice: Number(event.target.value) || 0 })}
              />
            </label>
          </div>

          <div className="public-marketplace-toolbar">
            <p className="ui-meta">
              {channels === null ? 'Загрузка…' : `Найдено: ${filtered.length}`}
            </p>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => setFilters(DEFAULT_PUBLIC_FILTERS)}>
              Сбросить фильтры
            </button>
          </div>

          {channels === null ? (
            <p className="public-marketplace-status" aria-busy="true">Загрузка каналов…</p>
          ) : error ? (
            <p className="public-marketplace-status">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="public-marketplace-empty">
              <p>По этому запросу активных каналов нет.</p>
              <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => setFilters(DEFAULT_PUBLIC_FILTERS)}>
                Показать все каналы
              </button>
            </div>
          ) : (
            <div className="ui-marketplace-grid">
              {filtered.map((channel) => (
                <PublicChannelCard key={channel.id} channel={channel} authenticated={authenticated} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export { PublicSiteHeader }
