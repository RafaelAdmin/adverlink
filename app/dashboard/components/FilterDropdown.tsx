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
}

const accentSelectedBg = 'color-mix(in srgb, var(--accent-primary, #9333ea) 20%, transparent)'

export default function FilterDropdown({
  value,
  onChange,
  options,
  size = 'sm',
  minWidth = 160,
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
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
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
        {selected.icon && (
          <span style={{ fontSize: isSmall ? '14px' : '16px' }}>{selected.icon}</span>
        )}
        <span>{selected.label}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 50,
            background: 'rgba(15,12,41,0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            overflow: 'hidden',
            minWidth,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
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
                background: value === option.value ? accentSelectedBg : 'transparent',
                border: 'none',
                color: value === option.value ? 'white' : 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'transparent'
                }
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
                <span style={{ marginLeft: 'auto', color: 'var(--accent-primary, #9333ea)' }}>
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
