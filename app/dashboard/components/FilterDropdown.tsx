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
          padding: isSmall ? '4px 10px' : '8px 14px',
          fontSize: isSmall ? '13px' : '14px',
          width: fullWidth ? '100%' : undefined,
        }}
      >
        {selected.icon && (
          <span style={{ fontSize: isSmall ? '14px' : '16px' }}>{selected.icon}</span>
        )}
        <span>{selected.label}</span>
        <span className="filter-dropdown-trigger__chevron" style={{ marginLeft: fullWidth ? 'auto' : undefined }}>
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
            minWidth: fullWidth ? undefined : minWidth,
            width: fullWidth ? '100%' : undefined,
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
                  <div className="ui-meta" style={{ fontSize: '11px' }}>
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
