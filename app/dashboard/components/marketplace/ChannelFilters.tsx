'use client'

import { useEffect, useRef, useState } from 'react'
import { CurrencyCode, getCurrencySymbol } from '@/lib/currency'
import CurrencySelector from '../CurrencySelector'
import FilterDropdown from '../FilterDropdown'
import { ADVERTISER_SORT_OPTIONS, COUNTRY_FILTER_OPTIONS, SOCIAL_FILTER_OPTIONS } from './constants'

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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px',
          padding: '7px 12px',
          color: 'white',
          fontSize: '13px',
          cursor: 'pointer',
          width: '100%',
          justifyContent: 'space-between',
          minWidth: '140px',
        }}
      >
        <span>
          {selected.flag} {selected.label}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'rgba(15,12,41,0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: '160px',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 14px',
                background: value === opt.value ? 'rgba(147,51,234,0.2)' : 'transparent',
                border: 'none',
                color: value === opt.value ? 'white' : 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) e.currentTarget.style.background = 'transparent'
              }}
            >
              {opt.flag && <span>{opt.flag}</span>}
              <span>{opt.label}</span>
              {value === opt.value && (
                <span style={{ marginLeft: 'auto', color: 'var(--accent-primary, #9333ea)' }}>✓</span>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Страна</span>
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
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Соцсеть</span>
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
