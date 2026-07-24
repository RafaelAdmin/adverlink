'use client'

import { useState, useRef, useEffect } from 'react'
import { CURRENCIES, CurrencyCode } from '@/lib/currency'

interface CurrencySelectorProps {
  value: CurrencyCode
  onChange: (currency: CurrencyCode) => void
  size?: 'sm' | 'md'
}

export default function CurrencySelector({ value, onChange, size = 'md' }: CurrencySelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = CURRENCIES.find(c => c.code === value) || CURRENCIES[0]

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isSmall = size === 'sm'

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={`currency-dropdown-trigger${open ? ' currency-dropdown-trigger--open' : ''}`}
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px',
          padding: isSmall ? '4px 10px' : '8px 14px',
          color: 'white',
          fontSize: isSmall ? '13px' : '14px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s',
        }}
      >
        <span style={{ fontSize: isSmall ? '14px' : '16px' }}>{selected.symbol}</span>
        <span>{selected.code}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          className="currency-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            background: 'rgba(15,12,41,0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            overflow: 'hidden',
            minWidth: '160px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {CURRENCIES.map(currency => (
            <button
              key={currency.code}
              type="button"
              className={`currency-dropdown-item${value === currency.code ? ' currency-dropdown-item--selected' : ''}`}
              onClick={() => {
                onChange(currency.code as CurrencyCode)
                setOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                color: value === currency.code ? 'white' : 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
            >
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>
                {currency.symbol}
              </span>
              <div>
                <div style={{ fontWeight: value === currency.code ? '600' : '400' }}>
                  {currency.code}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  {currency.name}
                </div>
              </div>
              {value === currency.code && (
                <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)' }}>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
