'use client'

import { useEffect, useRef, useState } from 'react'
import { PRO_PRICE_EUR } from '@/lib/subscriptions'
import { dealBtn, glassDealCard } from '@/lib/deals'

type PaymentMethod = 'card' | 'idram' | 'telcell'
type PaymentStep = 'form' | 'processing' | 'success'

const paymentInputClass =
  'bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm w-full outline-none focus-accent'

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export default function SubscriptionPaymentModal({
  open,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void | boolean>
  saving?: boolean
}) {
  const [step, setStep] = useState<PaymentStep>('form')
  const [method, setMethod] = useState<PaymentMethod>('card')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [walletPhone, setWalletPhone] = useState('')
  const confirmStarted = useRef(false)
  const onConfirmRef = useRef(onConfirm)
  onConfirmRef.current = onConfirm

  useEffect(() => {
    if (!open) return
    setStep('form')
    setMethod('card')
    setCardName('')
    setCardNumber('')
    setExpiry('')
    setCvv('')
    setWalletPhone('')
    confirmStarted.current = false
  }, [open])

  useEffect(() => {
    if (step !== 'processing') return
    const delay = 2000 + Math.floor(Math.random() * 1000)
    const timer = window.setTimeout(() => setStep('success'), delay)
    return () => window.clearTimeout(timer)
  }, [step])

  useEffect(() => {
    if (step !== 'success' || confirmStarted.current) return
    confirmStarted.current = true
    void (async () => {
      const result = await onConfirmRef.current()
      if (result === false) {
        confirmStarted.current = false
        setStep('form')
      }
    })()
  }, [step])

  if (!open) return null

  const cardDigits = cardNumber.replace(/\s/g, '')
  const canPayCard =
    cardName.trim().length >= 2 &&
    cardDigits.length === 16 &&
    expiry.length === 5 &&
    cvv.length >= 3
  const canPayWallet = walletPhone.replace(/\D/g, '').length >= 8
  const canPay = method === 'card' ? canPayCard : canPayWallet

  const handlePay = () => {
    if (!canPay || step !== 'form') return
    setStep('processing')
  }

  const handleClose = () => {
    if (step === 'processing' || saving) return
    onClose()
  }

  const methodTabs: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'card', label: 'Карта', icon: 'ti-credit-card' },
    { id: 'idram', label: 'Idram', icon: 'ti-wallet' },
    { id: 'telcell', label: 'Telcell', icon: 'ti-device-mobile' },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={handleClose} aria-hidden />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto"
          style={{ ...glassDealCard, padding: '28px', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'form' && (
            <>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-white text-lg font-bold">Подписка Pro</h2>
                  <p className="text-white/50 text-sm mt-1">Безопасная оплата через AdverLink Pay</p>
                </div>
                <button type="button" onClick={handleClose} className="text-white/40 hover:text-white text-xl leading-none" aria-label="Закрыть">
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
                <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Pro · ежемесячно</p>
                <p className="text-white text-2xl font-bold">€{PRO_PRICE_EUR}/мес</p>
                <p className="text-white/40 text-xs mt-1">Отмена в любой момент</p>
              </div>

              <div className="flex gap-2 mb-5 p-1 rounded-xl bg-white/5 border border-white/10">
                {methodTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMethod(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition ${
                      method === tab.id ? 'tab-pill-active text-white' : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <i className={`ti ${tab.icon} text-sm`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {method === 'card' && (
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Имя на карте</label>
                    <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} placeholder="IVAN IVANOV" className={paymentInputClass} />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Номер карты</label>
                    <input type="text" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" className={paymentInputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block">Срок</label>
                      <input type="text" inputMode="numeric" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" className={paymentInputClass} />
                    </div>
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block">CVV</label>
                      <input type="password" inputMode="numeric" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="•••" className={paymentInputClass} />
                    </div>
                  </div>
                </div>
              )}

              {(method === 'idram' || method === 'telcell') && (
                <div className="mb-5">
                  <label className="text-white/50 text-xs mb-1.5 block">Номер телефона</label>
                  <input type="tel" value={walletPhone} onChange={(e) => setWalletPhone(e.target.value)} placeholder="+374 XX XXX XXX" className={paymentInputClass} />
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button type="button" disabled={!canPay} className="btn-accent w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40" onClick={handlePay}>
                  Оплатить €{PRO_PRICE_EUR}/мес
                </button>
                <button type="button" onClick={handleClose} style={{ ...dealBtn.dispute, width: '100%', flex: 'unset' }}>
                  Отмена
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="py-10 px-4 text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-primary,#9333ea)] animate-spin" />
              </div>
              <h2 className="text-white text-lg font-bold mb-2">Обработка платежа</h2>
              <p className="text-white/50 text-sm">Пожалуйста, не закрывайте окно</p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 px-4 text-center">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-white text-lg font-bold mb-2">Подписка активирована!</h2>
              <p className="text-white/50 text-sm">Добро пожаловать в Pro</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
