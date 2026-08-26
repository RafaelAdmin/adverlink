'use client'

import { PRO_PRICE_EUR, PAYMENTS_BETA_MESSAGE } from '@/lib/pricing'
import { dealBtn, glassDealCard } from '@/lib/deals'

export default function SubscriptionPaymentModal({
  open,
  onClose,
  title = 'Подписка Pro',
  price = PRO_PRICE_EUR,
  pricePeriod = '/мес',
  priceHint = 'Pro · ежемесячно',
}: {
  open: boolean
  onClose: () => void
  onConfirm?: () => void | Promise<void | boolean>
  saving?: boolean
  title?: string
  subtitle?: string
  price?: number
  pricePeriod?: string
  priceHint?: string
  priceNote?: string
  payButtonLabel?: string
  successTitle?: string
  successMessage?: string
}) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto w-full max-w-md"
          style={{ ...glassDealCard, padding: '28px', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-white text-lg font-bold">{title}</h2>
              <p className="text-white/50 text-sm mt-1">Скоро · Early Access</p>
            </div>
            <button type="button" onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none" aria-label="Закрыть">
              ×
            </button>
          </div>

          <div
            className="text-center mb-5 rounded-2xl py-4 px-4"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary, #9333ea) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent-primary, #9333ea) 35%, transparent)',
            }}
          >
            <p className="text-white/50 text-xs uppercase tracking-wide mb-1">{priceHint}</p>
            <p className="text-white text-2xl font-bold">
              €{price}
              {pricePeriod}
            </p>
          </div>

          <div
            className="rounded-xl p-4 mb-6 text-sm leading-relaxed"
            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: 'rgba(255,255,255,0.75)' }}
          >
            {PAYMENTS_BETA_MESSAGE}
          </div>

          <p className="text-white/40 text-xs mb-5 text-center">
            Напишите на{' '}
            <a href="mailto:support@adverlink.am" className="text-white/60 underline">
              support@adverlink.am
            </a>{' '}
            для раннего доступа к Pro.
          </p>

          <button type="button" onClick={onClose} style={{ ...dealBtn.dispute, width: '100%', flex: 'unset' }}>
            Понятно
          </button>
        </div>
      </div>
    </>
  )
}
