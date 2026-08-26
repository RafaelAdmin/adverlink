'use client'

import { PAYMENTS_BETA_MESSAGE } from '@/lib/pricing'
import { dealBtn, glassDealCard } from '@/lib/deals'
import { formatAmdWithUsd } from '@/lib/currency'

export default function BetaPaymentNoticeModal({
  open,
  onClose,
  onConfirm,
  saving,
  title = 'Подтверждение',
  subtitle,
  budget,
  confirmLabel = 'Подтвердить',
  showBudget = true,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void | boolean>
  saving?: boolean
  title?: string
  subtitle?: string
  budget?: number | string | null
  confirmLabel?: string
  showBudget?: boolean
}) {
  if (!open) return null

  const amd = Number(budget) || 0

  const handleConfirm = () => {
    if (saving) return
    void onConfirm()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto"
          style={{ ...glassDealCard, padding: '28px', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-white text-lg font-bold">{title}</h2>
              {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-white/40 hover:text-white text-xl leading-none disabled:opacity-40"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>

          {showBudget && amd > 0 && (
            <div
              className="text-center mb-5 rounded-2xl py-4 px-4"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary, #9333ea) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent-primary, #9333ea) 35%, transparent)',
              }}
            >
              <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Бюджет сделки</p>
              <p className="text-white text-2xl font-bold">{formatAmdWithUsd(amd)}</p>
            </div>
          )}

          <div
            className="rounded-xl p-4 mb-6 text-sm leading-relaxed"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: 'rgba(255,255,255,0.75)' }}
          >
            {PAYMENTS_BETA_MESSAGE}
          </div>

          <p className="text-white/40 text-xs mb-5">
            На этапе Beta AdverLink не принимает и не удерживает платежи. Статус сделки отражает только
            согласование между сторонами.
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={saving}
              className="btn-accent w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
              onClick={handleConfirm}
            >
              {saving ? 'Сохранение...' : confirmLabel}
            </button>
            <button type="button" onClick={onClose} disabled={saving} style={{ ...dealBtn.dispute, width: '100%', flex: 'unset' }}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
