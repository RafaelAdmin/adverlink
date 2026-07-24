'use client'

import { useEffect, useRef, useState } from 'react'

export type FilterOption = {
  value: string
  label: string
  icon?: string
  sublabel?: string
}

type FilterDropdownProps = {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  size?: 'sm' | 'md'
  minWidth?: number
  fullWidth?: boolean
}

export default function FilterDropdown({
  value,
  onChange,
  options,
  size = 'sm',
  minWidth = 160,
  fullWidth = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value) || options[0]
  const isSmall = size === 'sm'

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div
      ref={ref}
      style={{ position: 'relative', display: fullWidth ? 'block' : 'inline-block', width: fullWidth ? '100%' : undefined }}
    >
      <button
        type="button"
        className={`filter-dropdown-trigger${open ? ' filter-dropdown-trigger--open' : ''}`}
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
          width: fullWidth ? '100%' : undefined,
        }}
      >
        {selected.icon && (
          <span style={{ fontSize: isSmall ? '14px' : '16px' }}>{selected.icon}</span>
        )}
        <span>{selected.label}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginLeft: fullWidth ? 'auto' : undefined }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          className="filter-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: fullWidth ? 0 : undefined,
            right: fullWidth ? undefined : 0,
            zIndex: 50,
            background: 'rgba(15,12,41,0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            overflow: 'hidden',
            minWidth: fullWidth ? undefined : minWidth,
            width: fullWidth ? '100%' : undefined,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`filter-dropdown-item${value === option.value ? ' filter-dropdown-item--selected' : ''}`}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                color: value === option.value ? 'white' : 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
            >
              {option.icon && (
                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>
                  {option.icon}
                </span>
              )}
              <div>
                <div style={{ fontWeight: value === option.value ? '600' : '400' }}>
                  {option.label}
                </div>
                {option.sublabel && (
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    {option.sublabel}
                  </div>
                )}
              </div>
              {value === option.value && (
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
