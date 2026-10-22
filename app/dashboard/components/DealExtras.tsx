'use client'

import { calcPaymentSplit, getAutoCompleteCountdown, getAutoCompleteDeadline } from '@/lib/deals'
import { formatAmdWithUsd } from '@/lib/currency'

export function SplitPaymentSummary({
  budget,
  commissionPercent = 10,
  settled = false,
}: {
  budget: number | null | undefined
  commissionPercent?: number
  settled?: boolean
}) {
  const split = calcPaymentSplit(budget, commissionPercent)
  return (
    <div style={{ marginTop: '16px' }}>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginBottom: '10px', textAlign: 'center' }}>
        {settled
          ? 'Выплата и комиссия AdverLink'
          : 'Ориентировочное распределение (без онлайн-оплаты)'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>AdverLink {split.commissionPercent}%</div>
        <div style={{ color: '#fb923c', fontWeight: '700', fontSize: '16px' }}>{split.platform.toLocaleString()} AMD</div>
      </div>
      <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>Владелец канала {100 - split.commissionPercent}%</div>
        <div style={{ color: '#4ade80', fontWeight: '700', fontSize: '16px' }}>{split.creator.toLocaleString()} AMD</div>
      </div>
      <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
        Итого: {formatAmdWithUsd(split.total)}
      </div>
      </div>
    </div>
  )
}

export function RefundSummary({ budget }: { budget: number | null | undefined }) {
  return (
    <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', padding: '14px', marginTop: '16px', textAlign: 'center' }}>
      <div style={{ color: '#93c5fd', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>Отмена сделки (Beta)</div>
      <div style={{ color: 'white', fontWeight: '700' }}>{formatAmdWithUsd(budget)}</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
        Платформа не удерживает средства — расчёты между сторонами напрямую
      </div>
    </div>
  )
}

export function AutoCompleteCountdown({ updatedAt }: { updatedAt: string | null | undefined }) {
  const countdown = getAutoCompleteCountdown(updatedAt)
  const deadline = getAutoCompleteDeadline(updatedAt)
  if (!countdown) return null
  const color = countdown.urgent ? '#f87171' : 'rgba(255,255,255,0.5)'
  const deadlineLabel = deadline ? deadline.toLocaleString('ru-RU') : ''
  return (
    <p style={{ color, fontSize: '13px', marginTop: '12px' }}>
      {countdown.expired
        ? `Срок автоподтверждения истёк${deadlineLabel ? ` (${deadlineLabel})` : ''}`
        : `Автоподтверждение через ${countdown.hours}ч ${countdown.minutes}м${deadlineLabel ? ` — ${deadlineLabel}` : ''}`}
    </p>
  )
}

export function PaymentReservedBadge() {
  return (
    <span style={{ background: 'rgba(234,179,8,0.2)', color: '#fbbf24', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', display: 'inline-block' }}>
      Онлайн-оплата пока недоступна
    </span>
  )
}
