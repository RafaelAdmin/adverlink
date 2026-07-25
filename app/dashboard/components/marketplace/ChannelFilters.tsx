'use client'

import { CurrencyCode, getCurrencySymbol } from '@/lib/currency'
import CurrencySelector from '../CurrencySelector'
import FilterDropdown from '../FilterDropdown'
import { ADVERTISER_SORT_OPTIONS, COUNTRY_FILTER_OPTIONS, SOCIAL_FILTER_OPTIONS } from './constants'

export default function ChannelFilters({
  search,
  setSearch,
  minSubs,
  setMinSubs,
  maxSubs,
  setMaxSubs,
  minViews,
  setMinViews,
  maxViews,
  setMaxViews,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  selectedSocialNet,
  setSelectedSocialNet,
  selectedCountry,
  setSelectedCountry,
  displayCurrency,
  setDisplayCurrency,
  sortBy,
  setSortBy,
  showFilters,
  setShowFilters,
}: {
  search: string
  setSearch: (v: string) => void
  minSubs: number
  setMinSubs: (v: number) => void
  maxSubs: number
  setMaxSubs: (v: number) => void
  minViews: number
  setMinViews: (v: number) => void
  maxViews: number
  setMaxViews: (v: number) => void
  minPrice: number
  setMinPrice: (v: number) => void
  maxPrice: number
  setMaxPrice: (v: number) => void
  selectedSocialNet: string
  setSelectedSocialNet: (v: string) => void
  selectedCountry: string
  setSelectedCountry: (v: string) => void
  displayCurrency: CurrencyCode
  setDisplayCurrency: (v: CurrencyCode) => void
  sortBy: string
  setSortBy: (v: string) => void
  showFilters: boolean
  setShowFilters: (v: boolean) => void
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Поиск по названию или username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '10px 16px',
            color: 'white',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '10px',
            border: showFilters
              ? '1px solid var(--accent-primary, #9333ea)'
              : '1px solid rgba(255,255,255,0.15)',
            background: showFilters
              ? 'color-mix(in srgb, var(--accent-primary, #9333ea) 15%, transparent)'
              : 'rgba(255,255,255,0.08)',
            color: showFilters ? 'white' : 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <i className="ti ti-adjustments-horizontal" style={{ fontSize: '14px' }} />
          Фильтры {showFilters ? '▲' : '▼'}
        </button>
        <FilterDropdown
          value={sortBy}
          onChange={setSortBy}
          options={ADVERTISER_SORT_OPTIONS}
          size="sm"
          minWidth={180}
        />
        <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} size="sm" />
      </div>

      {showFilters && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Страна</span>
              <FilterDropdown
                value={selectedCountry}
                onChange={setSelectedCountry}
                options={COUNTRY_FILTER_OPTIONS}
                size="sm"
                minWidth={200}
                fullWidth
              />
            </div>

            <div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Соцсеть</span>
              <FilterDropdown
                value={selectedSocialNet}
                onChange={setSelectedSocialNet}
                options={SOCIAL_FILTER_OPTIONS}
                size="sm"
                minWidth={200}
                fullWidth
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Подписчики</span>
                <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                  {minSubs.toLocaleString()} — {maxSubs >= 1000000 ? '1M+' : maxSubs.toLocaleString()}
                </span>
              </div>
              <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="range"
                  min={0}
                  max={1000000}
                  step={1000}
                  value={minSubs}
                  onChange={(e) => setMinSubs(Math.min(Number(e.target.value), maxSubs - 1000))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }}
                />
                <input
                  type="range"
                  min={0}
                  max={1000000}
                  step={1000}
                  value={maxSubs}
                  onChange={(e) => setMaxSubs(Math.max(Number(e.target.value), minSubs + 1000))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Охваты</span>
                <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                  {minViews.toLocaleString()} — {maxViews >= 500000 ? '500K+' : maxViews.toLocaleString()}
                </span>
              </div>
              <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="range"
                  min={0}
                  max={500000}
                  step={500}
                  value={minViews}
                  onChange={(e) => setMinViews(Math.min(Number(e.target.value), maxViews - 500))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }}
                />
                <input
                  type="range"
                  min={0}
                  max={500000}
                  step={500}
                  value={maxViews}
                  onChange={(e) => setMaxViews(Math.max(Number(e.target.value), minViews + 500))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Цена</span>
                <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                  {getCurrencySymbol(displayCurrency)}{minPrice} — {maxPrice >= 10000 ? '10K+' : getCurrencySymbol(displayCurrency) + maxPrice}
                </span>
              </div>
              <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={10}
                  value={minPrice}
                  onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 10))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }}
                />
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={10}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 10))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setMinSubs(0)
                setMaxSubs(1000000)
                setMinViews(0)
                setMaxViews(500000)
                setMinPrice(0)
                setMaxPrice(10000)
                setSelectedSocialNet('all')
                setSelectedCountry('all')
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                padding: '6px 14px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      )}
    </>
  )
}
