'use client'

import { useEffect, useRef, useState } from 'react'
import { CurrencyCode, getCurrencySymbol } from '@/lib/currency'
import CurrencySelector from '../CurrencySelector'
import FilterDropdown from '../FilterDropdown'
import { ADVERTISER_SORT_OPTIONS, COUNTRY_FILTER_OPTIONS, SOCIAL_FILTER_OPTIONS } from './constants'
import { FilterLabel } from './filter-ui'

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string; flag?: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find((o) => o.value === value) || options[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`filter-dropdown-trigger w-full ${open ? 'filter-dropdown-trigger--open' : ''}`}
        style={{ minWidth: '140px', justifyContent: 'space-between' }}
      >
        <span>{selected.flag} {selected.label}</span>
        <span className="filter-dropdown-trigger__chevron ui-meta">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="filter-dropdown-menu" style={{ minWidth: '160px' }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`filter-dropdown-item ${value === opt.value ? 'filter-dropdown-item--selected' : ''}`}
            >
              {opt.flag && <span>{opt.flag}</span>}
              <span>{opt.label}</span>
              {value === opt.value && (
                <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
      <div className="flex gap-2.5 mb-3 flex-wrap items-center">
        <input
          placeholder="Поиск по названию или username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="marketplace-search-input flex-1"
          style={{ minWidth: '200px' }}
        />
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`ui-btn ui-btn--sm ${showFilters ? 'ui-btn--primary' : 'ui-btn--secondary'}`}
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
        <div className="marketplace-filters-panel">
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <div>
              <FilterLabel>Страна</FilterLabel>
              <CustomSelect
                value={selectedCountry}
                onChange={setSelectedCountry}
                options={COUNTRY_FILTER_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                  flag: o.icon,
                }))}
              />
            </div>

            <div>
              <FilterLabel>Соцсеть</FilterLabel>
              <CustomSelect
                value={selectedSocialNet}
                onChange={setSelectedSocialNet}
                options={SOCIAL_FILTER_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                  flag: o.icon,
                }))}
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <FilterLabel>Подписчики</FilterLabel>
                <span className="marketplace-filter-range-value">
                  {minSubs.toLocaleString()} — {maxSubs >= 1000000 ? '1M+' : maxSubs.toLocaleString()}
                </span>
              </div>
              <div className="relative h-5 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={1000000}
                  step={1000}
                  value={minSubs}
                  onChange={(e) => setMinSubs(Math.min(Number(e.target.value), maxSubs - 1000))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary)', zIndex: 1 }}
                />
                <input
                  type="range"
                  min={0}
                  max={1000000}
                  step={1000}
                  value={maxSubs}
                  onChange={(e) => setMaxSubs(Math.max(Number(e.target.value), minSubs + 1000))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary)', zIndex: 2, background: 'transparent' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <FilterLabel>Охваты</FilterLabel>
                <span className="marketplace-filter-range-value">
                  {minViews.toLocaleString()} — {maxViews >= 500000 ? '500K+' : maxViews.toLocaleString()}
                </span>
              </div>
              <div className="relative h-5 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={500000}
                  step={500}
                  value={minViews}
                  onChange={(e) => setMinViews(Math.min(Number(e.target.value), maxViews - 500))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary)', zIndex: 1 }}
                />
                <input
                  type="range"
                  min={0}
                  max={500000}
                  step={500}
                  value={maxViews}
                  onChange={(e) => setMaxViews(Math.max(Number(e.target.value), minViews + 500))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary)', zIndex: 2, background: 'transparent' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <FilterLabel>Цена</FilterLabel>
                <span className="marketplace-filter-range-value">
                  {getCurrencySymbol(displayCurrency)}{minPrice} — {maxPrice >= 10000 ? '10K+' : getCurrencySymbol(displayCurrency) + maxPrice}
                </span>
              </div>
              <div className="relative h-5 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={10}
                  value={minPrice}
                  onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 10))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary)', zIndex: 1 }}
                />
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={10}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 10))}
                  style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary)', zIndex: 2, background: 'transparent' }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
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
              className="ui-btn ui-btn--ghost ui-btn--sm"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      )}
    </>
  )
}
