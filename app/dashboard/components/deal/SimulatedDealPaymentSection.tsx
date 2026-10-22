'use client'

import { useRef, useState } from 'react'
import { glassDealCard, dealBtn } from '@/lib/deals'
import { formatAmdWithUsd } from '@/lib/currency'
import type { AdRequest, CurrencyCode } from '@/lib/database.types'
import {
  applyDealApiPatch,
  getDealApiError,
  postSimulatedDealPayment,
} from '@/lib/deal-api-client'
import {
  isDealAwaitingSimulatedPayment,
  isDealPaymentComplete,
  isSimulatedDealPayment,
  isSimulatedPaymentsEnabledClient,
  resolveDealPaymentAmount,
} from '@/lib/deal-payments'
import { buildLifecycleContextFromAdRequest } from '@/lib/placements-ui'
import type { DealPlacement } from '@/lib/database.types'

function formatPaymentAmount(amount: number, currency: CurrencyCode | string): string {
  if (currency === 'AMD') return formatAmdWithUsd(amount)
  return `${amount.toLocaleString('ru-RU')} ${currency}`
}

type SimulatedDealPaymentSectionProps = {
  dealId: string
  request: AdRequest
  placements: DealPlacement[]
  role: 'creator' | 'advertiser'
  onDealUpdate: (patch: Partial<AdRequest>) => void
  onRefresh: () => Promise<void>
}

export default function SimulatedDealPaymentSection({
  dealId,
  request,
  placements,
  role,
  onDealUpdate,
  onRefresh,
}: SimulatedDealPaymentSectionProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inFlightRef = useRef(false)

  if (!isSimulatedPaymentsEnabledClient()) {
    return null
  }

  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  const paymentAmount = resolveDealPaymentAmount(request)
  const awaitingPayment = isDealAwaitingSimulatedPayment(request, ctx)
  const paymentComplete = isDealPaymentComplete(request)
  const simulatedPaid = isSimulatedDealPayment(request)

  if (!awaitingPayment && !paymentComplete && !simulatedPaid) {
    return null
  }

  const handlePay = async () => {
    if (inFlightRef.current || submitting) return
    inFlightRef.current = true
    setSubmitting(true)
    setError(null)

    const result = await postSimulatedDealPayment(dealId)
    const apiError = getDealApiError(result)

    if (apiError) {
      setError(apiError)
      setSubmitting(false)
      inFlightRef.current = false
      return
    }

    applyDealApiPatch(onDealUpdate, result)
    setSuccess(true)
    setSubmitting(false)
    inFlightRef.current = false
    await onRefresh()
  }

  if (role === 'creator') {
    if (!simulatedPaid) return null
    return (
      <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="text-white font-semibold">Оплата</h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300">
            BETA
          </span>
        </div>
        <p className="text-green-300 text-sm font-medium mb-2">Тестовая оплата подтверждена</p>
        <p className="text-white/60 text-sm">
          Оплата подтверждена в тестовом режиме. Реальные средства не переводились.
        </p>
        {paymentAmount && (
          <p className="text-white/50 text-xs mt-3">
            Сумма по условиям: {formatPaymentAmount(paymentAmount.amount, paymentAmount.currency)}
          </p>
        )}
      </div>
    )
  }

  if (paymentComplete || success) {
    return (
      <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
        <h2 className="text-white font-semibold mb-2">Оплата</h2>
        <p className="text-green-300 font-medium mb-2">Оплата выполнена. Ожидайте выполнения заказа</p>
        <p className="text-white/60 text-sm">
          Оплата в тестовом режиме. Реальные средства не списывались.
        </p>
      </div>
    )
  }

  if (!paymentAmount) return null

  return (
    <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
      <h2 className="text-white font-semibold mb-4">Оплата размещения</h2>

      <div className="space-y-3 text-sm mb-5">
        <div className="flex justify-between gap-4">
          <span className="text-white/50">Стоимость</span>
          <span className="text-white font-medium">
            {formatPaymentAmount(paymentAmount.amount, paymentAmount.currency)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/50">Количество размещений</span>
          <span className="text-white font-medium">{paymentAmount.placementsCount}</span>
        </div>
        <div className="flex justify-between gap-4 pt-2 border-t border-white/10">
          <span className="text-white/70 font-medium">Итого</span>
          <span className="text-price-accent font-semibold">
            {formatPaymentAmount(paymentAmount.amount, paymentAmount.currency)}
          </span>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mb-5 text-sm leading-relaxed"
        style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)' }}
      >
        <p className="text-yellow-200 font-semibold mb-2">Тестовая оплата</p>
        <p className="text-white/75">
          Сейчас AdverLink работает в Beta-режиме. Деньги не будут списаны с вашей карты. Эта
          оплата используется только для тестирования полного процесса сделки.
        </p>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        type="button"
        disabled={submitting}
        style={{ ...dealBtn.confirm, width: '100%', opacity: submitting ? 0.6 : 1 }}
        onClick={handlePay}
      >
        {submitting ? 'Обрабатываем оплату...' : 'Оплатить заказ'}
      </button>
    </div>
  )
}
