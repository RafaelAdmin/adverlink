'use client'

import { useRef, useState } from 'react'
import { calcPaymentSplit, dealBtn, glassDealCard, PLATFORM_COMMISSION_PERCENT } from '@/lib/deals'
import { formatAmdWithUsd, formatPrice } from '@/lib/currency'
import { isPriceListCurrency } from '@/lib/channel-prices'
import type { AdRequest, CurrencyCode, DealPlacement } from '@/lib/database.types'
import {
  applyDealApiPatch,
  getDealApiError,
  postSimulatedDealPayment,
} from '@/lib/deal-api-client'
import {
  buildSimulatedPaymentLedger,
  isDealAwaitingSimulatedPayment,
  isDealPaymentComplete,
  isMarketplaceStubPaymentDeal,
  isSimulatedDealPayment,
  isSimulatedPaymentsEnabledClient,
  resolveDealPaymentAmount,
} from '@/lib/deal-payments'
import { buildLifecycleContextFromAdRequest } from '@/lib/placements-ui'

function formatPaymentAmount(amount: number, currency: CurrencyCode | string): string {
  if (isPriceListCurrency(currency)) return formatPrice(amount, currency)
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

  const ctx = buildLifecycleContextFromAdRequest(request, placements)
  const marketplaceStub = isMarketplaceStubPaymentDeal(request, ctx)
  if (!marketplaceStub && !isSimulatedPaymentsEnabledClient()) {
    return null
  }

  const paymentAmount = resolveDealPaymentAmount(request)
  const awaitingPayment = isDealAwaitingSimulatedPayment(request, ctx)
  const paid =
    request.payment_status === 'paid' ||
    isSimulatedDealPayment(request) ||
    isDealPaymentComplete(request) ||
    success
  const ledger = paymentAmount
    ? buildSimulatedPaymentLedger(
        paymentAmount.amount,
        paymentAmount.currency,
        request.platform_commission || PLATFORM_COMMISSION_PERCENT,
      )
    : null

  if (!awaitingPayment && !paid) {
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

  const split = paymentAmount
    ? calcPaymentSplit(paymentAmount.amount, request.platform_commission || PLATFORM_COMMISSION_PERCENT)
    : null

  if (role === 'creator') {
    if (!paid) {
      return (
        <div style={{ ...glassDealCard, padding: '20px', marginBottom: '16px' }}>
          <h2 className="text-white font-semibold mb-2">Оплата</h2>
          <p className="text-white/60 text-sm m-0">Ожидает оплаты рекламодателем. После оплаты можно отправить подтверждение выполнения.</p>
        </div>
      )
    }
    return (
      <PaidLedgerCard
        title="Оплата получена"
        note="Средства зачислены фиктивно (заглушка Safe Deal). Реальные деньги не переводились."
        ledger={ledger}
      />
    )
  }

  if (paid) {
    return (
      <PaidLedgerCard
        title="Оплата выполнена. Ожидайте выполнения заказа"
        note="С рекламодателя списана полная сумма, владельцу канала начислено 90%, AdverLink — 10%. Это тестовая заглушка, карта не списывалась."
        ledger={ledger}
      />
    )
  }

  if (!paymentAmount || !split || role !== 'advertiser') return null

  return (
    <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
      <h2 className="text-white font-semibold mb-4">Оплата заказа</h2>

      <div className="space-y-3 text-sm mb-5">
        <div className="flex justify-between gap-4">
          <span className="text-white/50">Стоимость</span>
          <span className="text-white font-medium">
            {formatPaymentAmount(paymentAmount.amount, paymentAmount.currency)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/50">Списать с рекламодателя</span>
          <span className="text-white font-medium">
            {formatPaymentAmount(split.total, paymentAmount.currency)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/50">Начислить владельцу канала (90%)</span>
          <span className="text-green-300 font-medium">
            {formatPaymentAmount(split.creator, paymentAmount.currency)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-white/50">Комиссия AdverLink (10%)</span>
          <span className="text-orange-300 font-medium">
            {formatPaymentAmount(split.platform, paymentAmount.currency)}
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-2 border-t border-white/10">
          <span className="text-white/70 font-medium">Итого к оплате</span>
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
        <p className="text-white/75 m-0">
          После нажатия сумма спишется с рекламодателя и начислится владельцу канала фиктивно. Карта
          не используется.
        </p>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        type="button"
        disabled={submitting}
        style={{ ...dealBtn.confirm, width: '100%', opacity: submitting ? 0.6 : 1 }}
        onClick={handlePay}
      >
        {submitting ? 'Списываем оплату...' : 'Оплатить заказ'}
      </button>
    </div>
  )
}

function PaidLedgerCard({
  title,
  note,
  ledger,
}: {
  title: string
  note: string
  ledger: ReturnType<typeof buildSimulatedPaymentLedger> | null
}) {
  return (
    <div style={{ ...glassDealCard, padding: '24px', marginBottom: '16px' }}>
      <h2 className="text-white font-semibold mb-2">Оплата</h2>
      <p className="text-green-300 font-medium mb-2">{title}</p>
      <p className="text-white/60 text-sm mb-4">{note}</p>
      {ledger ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-white/50">Списано с рекламодателя</span>
            <span className="text-white">{formatPaymentAmount(ledger.debitAdvertiser, ledger.currency)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/50">Начислено владельцу канала</span>
            <span className="text-green-300">{formatPaymentAmount(ledger.creditCreator, ledger.currency)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/50">Комиссия AdverLink</span>
            <span className="text-orange-300">{formatPaymentAmount(ledger.creditPlatform, ledger.currency)}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
