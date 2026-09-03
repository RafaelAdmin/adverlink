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
          padding: isSmall ? '4px 10px' : '8px 14px',
          fontSize: isSmall ? '13px' : '14px',
        }}
      >
        <span style={{ fontSize: isSmall ? '14px' : '16px' }}>{selected.symbol}</span>
        <span>{selected.code}</span>
        <span className="currency-dropdown-trigger__chevron">
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
            minWidth: '160px',
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
            >
              <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>
                {currency.symbol}
              </span>
              <div>
                <div style={{ fontWeight: value === currency.code ? '600' : '400' }}>
                  {currency.code}
                </div>
                <div className="ui-meta" style={{ fontSize: '11px' }}>
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
