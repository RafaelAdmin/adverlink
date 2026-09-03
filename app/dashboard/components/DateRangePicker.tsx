'use client'

import { formatPeriodLabel } from '@/lib/subscriptions'
import type { CSSProperties, ReactNode } from 'react'

export default function DateRangePicker({
  from,
  to,
  onChange,
  disabled,
  style,
  actions,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  disabled?: boolean
  style?: CSSProperties
  actions?: ReactNode
}) {
  const fromDate = from ? new Date(from) : new Date()
  const toDate = to ? new Date(to) : new Date()

  return (
    <div className="dashboard-panel ui-surface--pad-sm" style={{ marginBottom: '16px', ...style }}>
      <div className="ui-meta text-xs mb-2">Период отчёта</div>
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-wrap gap-3 items-end min-w-0">
          <label className="flex flex-col gap-1">
            <span className="ui-meta text-[11px]">С</span>
            <input
              type="date"
              value={from}
              max={to}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value, to)}
              className="ui-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="ui-meta text-[11px]">По</span>
            <input
              type="date"
              value={to}
              min={from}
              disabled={disabled}
              onChange={(e) => onChange(from, e.target.value)}
              className="ui-input"
            />
          </label>
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2 items-center shrink-0">{actions}</div>
        ) : null}
      </div>
      <div className="ui-meta text-xs mt-2">{formatPeriodLabel(fromDate, toDate)}</div>
    </div>
  )
}
