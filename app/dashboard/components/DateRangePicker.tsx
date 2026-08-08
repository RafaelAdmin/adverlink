'use client'

import { formatPeriodLabel } from '@/lib/subscriptions'

export default function DateRangePicker({
  from,
  to,
  onChange,
  disabled,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  disabled?: boolean
}) {
  const fromDate = from ? new Date(from) : new Date()
  const toDate = to ? new Date(to) : new Date()

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '16px',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '10px' }}>
        Период отчёта
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>С</span>
          <input
            type="date"
            value={from}
            max={to}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value, to)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus-accent"
            style={{ colorScheme: 'dark' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>По</span>
          <input
            type="date"
            value={to}
            min={from}
            disabled={disabled}
            onChange={(e) => onChange(from, e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus-accent"
            style={{ colorScheme: 'dark' }}
          />
        </label>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginLeft: '4px' }}>
          {formatPeriodLabel(fromDate, toDate)}
        </span>
      </div>
    </div>
  )
}
