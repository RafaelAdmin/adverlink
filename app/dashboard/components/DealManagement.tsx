'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  canLeaveReview,
  dealBtn,
  getAdvertiserSteps,
  getCreatorSteps,
  getDealStatusBadge,
  glassDealCard,
  normalizeDealStatus,
} from '@/lib/deals'
import { formatAmdWithUsd, toUsdEstimate } from '@/lib/currency'
import DealChat from './DealChat'
import { AutoCompleteCountdown, PaymentReservedBadge, RefundSummary, SplitPaymentSummary } from './DealExtras'
import { incrementCampaignSlots } from '@/lib/campaigns'
import { markDealViewed } from '@/lib/notifications'

export function DealStatusPill({ status, large }: { status: string; large?: boolean }) {
  const badge = getDealStatusBadge(status)
  return (
    <span
      style={{
        background: badge.bg,
        color: badge.color,
        fontSize: large ? '13px' : '11px',
        fontWeight: '600',
        padding: large ? '6px 14px' : '4px 10px',
        borderRadius: '20px',
        whiteSpace: 'nowrap',
      }}
    >
      {badge.label}
    </span>
  )
}

export function ProofLinksList({ links }: { links?: string[] | null }) {
  if (!links?.length) return null
  return (
    <div className="mt-3">
      <div className="text-white/50 text-xs mb-2">Ссылки на посты</div>
      {links.map((link, i) => (
        <a
          key={i}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#60a5fa',
            fontSize: '13px',
            textDecoration: 'none',
            padding: '6px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <i className="ti ti-external-link" style={{ fontSize: '14px' }} />
          {link.length > 50 ? `${link.substring(0, 50)}...` : link}
        </a>
      ))}
    </div>
  )
}

function ProgressTracker({ steps }: { steps: { label: string; done: boolean }[] }) {
  return (
    <div className="flex items-start w-full my-4">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 min-w-0">
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step.done ? 'progress-step-done' : 'bg-white/10 text-white/30'
              }`}
            >
              {step.done ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 text-center ${step.done ? 'progress-step-label-done' : 'text-white/30'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-1 mt-3 ${step.done && steps[i + 1]?.done !== false ? 'progress-line-done' : 'bg-white/10'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function DealReviewForm({
  onSubmit,
  onCancel,
  error,
}: {
  onSubmit: (rating: number, comment: string) => void
  onCancel: () => void
  error?: string
}) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4">
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} type="button" onClick={() => setRating(s)} className={`text-xl ${s <= rating ? 'text-yellow-400' : 'text-white/20'}`}>
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Комментарий..."
        className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm w-full mb-3 resize-none outline-none focus-accent"
      />
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => onSubmit(rating, comment)} className="btn-accent text-white rounded-full px-4 py-2 text-sm">
          Отправить
        </button>
        <button type="button" onClick={onCancel} className="border border-white/20 text-white/60 rounded-full px-4 py-2 text-sm">
          Отмена
        </button>
      </div>
    </div>
  )
}

export function CreatorDealActions({
  request,
  channel,
  userId,
  onUpdate,
  showDetails = true,
}: {
  request: any
  channel?: any
  userId: string
  onUpdate: (patch: Record<string, unknown>) => void
  showDetails?: boolean
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [postsCount, setPostsCount] = useState(request.posts_count || 1)
  const [proofLinks, setProofLinks] = useState((request.proof_links || []).join('\n'))
  const [creatorNote, setCreatorNote] = useState(request.creator_note || '')
  const [showReview, setShowReview] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [campaignBrief, setCampaignBrief] = useState<string | null>(null)

  const status = normalizeDealStatus(request.status)

  useEffect(() => {
    if (!request.campaign_id) return
    const loadBrief = async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('brief')
        .eq('id', request.campaign_id)
        .single()
      setCampaignBrief(data?.brief || null)
    }
    loadBrief()
  }, [request.campaign_id])

  useEffect(() => {
    setPostsCount(request.posts_count || 1)
    setProofLinks((request.proof_links || []).join('\n'))
    setCreatorNote(request.creator_note || '')
  }, [request.id, request.posts_count, request.proof_links, request.creator_note])

  const patch = async (data: Record<string, unknown>) => {
    setSaving(true)
    const payload = { ...data, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('ad_requests').update(payload).eq('id', request.id)
    setSaving(false)
    if (error) return false
    onUpdate(payload)
    return true
  }

  const submitReview = async (rating: number, comment: string) => {
    if (!request.advertiser_id) {
      setReviewError('Нельзя оставить отзыв: не указан рекламодатель')
      return
    }
    setReviewError('')
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: userId,
      reviewee_id: request.advertiser_id,
      rating,
      comment: comment.trim(),
      deal_id: request.id,
    })
    if (error) {
      setReviewError(error.message)
      return
    }
    setReviewDone(true)
    setShowReview(false)
  }

  return (
    <div>
      {showDetails && (
        <div className="space-y-3 text-sm mb-4">
          <div>
            <div className="text-white/50 mb-1">Рекламодатель</div>
            <div className="text-white font-medium">{request.advertiser_name}</div>
            <div className="text-white/70">{request.advertiser_contact}</div>
          </div>
          <div>
            <div className="text-white/50 mb-1">Сообщение</div>
            <p className="text-white/80">{request.message}</p>
          </div>
          <div>
            <div className="text-white/50 mb-1">Бюджет</div>
            <p className="text-price-accent">{formatAmdWithUsd(request.budget)}</p>
          </div>
          {channel && (
            <div>
              <div className="text-white/50 mb-1">Канал</div>
              <p className="text-white/80">
                {channel.name} (@{channel.telegram_username})
              </p>
            </div>
          )}
        </div>
      )}

      <ProgressTracker steps={getCreatorSteps(request.status)} />

      {status === 'payment_pending' && (
        <div style={{ marginBottom: '12px' }}>
          <PaymentReservedBadge />
        </div>
      )}

      {(status === 'payment_pending') && !request.campaign_id && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            type="button"
            disabled={saving}
            style={{ ...dealBtn.accept, opacity: saving ? 0.6 : 1 }}
            onClick={async () => {
              const ok = await patch({ status: 'accepted', accepted_at: new Date().toISOString() })
              if (ok) {
                try {
                  await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'deal_accepted',
                      channelId: request.channel_id,
                      dealId: request.id,
                      advertiserName: request.advertiser_name,
                      advertiserContact: request.advertiser_contact,
                      budget: request.budget,
                    }),
                  })
                } catch {
                  console.log('Notification failed silently')
                }
              }
            }}
          >
            ✓ Принять заказ
          </button>
          <button
            type="button"
            disabled={saving}
            style={{ ...dealBtn.reject, opacity: saving ? 0.6 : 1 }}
            onClick={async () => {
              await patch({ status: 'cancelled', payment_status: 'refunded' })
            }}
          >
            ✗ Отклонить
          </button>
        </div>
      )}

      {status === 'new' && request.campaign_id && (
        <p className="text-white/50 text-sm mt-2">Ожидает решения рекламодателя по кампании</p>
      )}

      {status === 'accepted' && (
        <div>
          <span style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
            Заказ принят ✓
          </span>
          {campaignBrief && (
            <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-blue-400 text-xs mb-1">Бриф от рекламодателя</div>
              <p className="text-white/80 text-sm whitespace-pre-wrap">{campaignBrief}</p>
            </div>
          )}
          <label className="block mt-4">
            <span className="text-white/50 text-xs mb-2 block">Количество постов</span>
            <input
              type="number"
              min={1}
              value={postsCount}
              onChange={(e) => setPostsCount(Number(e.target.value) || 1)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm w-full outline-none focus-accent"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            className="btn-accent w-full mt-4 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
            onClick={async () => {
              await patch({ status: 'in_progress', posts_count: postsCount })
            }}
          >
            Начать работу
          </button>
        </div>
      )}

      {status === 'in_progress' && (
        <div>
          <span style={{ background: 'rgba(234,179,8,0.15)', color: '#fbbf24', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
            В работе 🔄
          </span>
          {campaignBrief && (
            <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-blue-400 text-xs mb-1">Бриф от рекламодателя</div>
              <p className="text-white/80 text-sm whitespace-pre-wrap">{campaignBrief}</p>
            </div>
          )}
          {request.advertiser_note && (
            <div className="mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="text-yellow-400 text-xs mb-1">Замечания рекламодателя</div>
              <p className="text-white/70 text-sm">{request.advertiser_note}</p>
            </div>
          )}
          <label className="block mt-4">
            <span className="text-white/50 text-xs mb-2 block">Ссылки на посты</span>
            <textarea
              value={proofLinks}
              onChange={(e) => setProofLinks(e.target.value)}
              placeholder="Вставьте ссылки на опубликованные посты (каждая с новой строки)"
              rows={4}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm w-full outline-none focus-accent resize-none"
            />
          </label>
          <label className="block mt-3">
            <span className="text-white/50 text-xs mb-2 block">Комментарий (необязательно)</span>
            <textarea
              value={creatorNote}
              onChange={(e) => setCreatorNote(e.target.value)}
              placeholder="Комментарий для рекламодателя (необязательно)"
              rows={2}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm w-full outline-none focus-accent resize-none"
            />
          </label>
          <button
            type="button"
            disabled={saving || !proofLinks.trim()}
            style={{ ...dealBtn.submit, marginTop: '16px', opacity: saving || !proofLinks.trim() ? 0.5 : 1 }}
            onClick={async () => {
              const links = proofLinks.split('\n').map((l: string) => l.trim()).filter(Boolean)
              await patch({
                status: 'submitted',
                proof_links: links,
                creator_note: creatorNote.trim() || null,
              })
            }}
          >
            Отправить на проверку
          </button>
        </div>
      )}

      {status === 'submitted' && (
        <div>
          <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
            Отправлено на проверку ⏳
          </span>
          <ProofLinksList links={request.proof_links} />
          {request.creator_note && (
            <p className="text-white/60 text-sm mt-3">
              <span className="text-white/40">Комментарий: </span>
              {request.creator_note}
            </p>
          )}
          <AutoCompleteCountdown updatedAt={request.updated_at || request.created_at} />
          <p className="text-white/40 text-sm mt-4">Ожидаем подтверждения от рекламодателя</p>
        </div>
      )}

      {status === 'disputed' && (
        <div>
          <DealStatusPill status="disputed" large />
          <p className="text-white/50 text-sm mt-3">Спор открыт. Ожидаем решения администратора.</p>
          {request.dispute_reason && (
            <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="text-orange-400 text-xs mb-1">Причина спора</div>
              <p className="text-white/70 text-sm">{request.dispute_reason}</p>
            </div>
          )}
        </div>
      )}

      {status === 'resolved_creator' && (
        <div>
          <DealStatusPill status="resolved_creator" large />
          <SplitPaymentSummary budget={request.budget} commissionPercent={request.platform_commission || 10} />
        </div>
      )}

      {status === 'resolved_advertiser' && (
        <div>
          <DealStatusPill status="resolved_advertiser" large />
          <RefundSummary budget={request.budget} />
        </div>
      )}

      {status === 'completed' && (
        <div>
          <span style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
            Завершено ✅
          </span>
          {request.auto_completed && (
            <span className="text-white/40 text-xs ml-2">(автоподтверждение)</span>
          )}
          {request.completed_at && (
            <p className="text-white/40 text-xs mt-2">
              {new Date(request.completed_at).toLocaleString('ru-RU')}
            </p>
          )}
          <SplitPaymentSummary budget={request.budget} commissionPercent={request.platform_commission || 10} />
          <ProofLinksList links={request.proof_links} />
          {!reviewDone && !showReview && (
            <button
              type="button"
              onClick={() => setShowReview(true)}
              className="border border-white/20 text-white/80 rounded-full px-4 py-2 text-sm mt-4 hover:text-white"
            >
              Оставить отзыв
            </button>
          )}
          {reviewDone && <p className="text-green-400 text-sm mt-4">✓ Отзыв отправлен</p>}
          {showReview && (
            <DealReviewForm onSubmit={submitReview} onCancel={() => setShowReview(false)} error={reviewError} />
          )}
        </div>
      )}

      {status === 'cancelled' && (
        <div>
          <DealStatusPill status="cancelled" large />
          <RefundSummary budget={request.budget} />
        </div>
      )}

      {status === 'rejected' && (
        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
          Отклонено ✗
        </span>
      )}
    </div>
  )
}

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

export function DealPaymentModal({
  open,
  onClose,
  onConfirm,
  budget,
  saving,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void | boolean>
  budget: number | string | null | undefined
  channel?: any
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

  const amd = Number(budget) || 0
  const usd = toUsdEstimate(budget)

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
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
        onClick={handleClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deal-payment-title"
          className="pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto"
          style={{
            ...glassDealCard,
            padding: '28px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'form' && (
            <>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 id="deal-payment-title" className="text-white text-lg font-bold">
                    Оплата заказа
                  </h2>
                  <p className="text-white/50 text-sm mt-1">Безопасная оплата через AdverLink Pay</p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-white/40 hover:text-white text-xl leading-none"
                  aria-label="Закрыть"
                >
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
                <p className="text-white/50 text-xs uppercase tracking-wide mb-1">К оплате</p>
                <p className="text-white text-2xl font-bold">{amd.toLocaleString('ru-RU')} AMD</p>
                <p className="text-price-accent text-base font-semibold mt-0.5">≈ ${usd}</p>
              </div>

              <div className="flex gap-2 mb-5 p-1 rounded-xl bg-white/5 border border-white/10">
                {methodTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMethod(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition ${
                      method === tab.id
                        ? 'tab-pill-active text-white'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <i className={`ti ${tab.icon} text-sm`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {method === 'card' && (
                <div className="space-y-3 mb-5">
                  <div
                    className="rounded-2xl p-4 mb-4"
                    style={{
                      background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #9333ea) 40%, #1a1a2e), #0f0f1a)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <div className="flex justify-between items-start mb-8">
                      <i className="ti ti-credit-card text-white/80 text-2xl" />
                      <span className="text-white/40 text-xs font-mono tracking-widest">VISA</span>
                    </div>
                    <p className="text-white/90 font-mono text-lg tracking-widest mb-4 min-h-[28px]">
                      {cardNumber || '•••• •••• •••• ••••'}
                    </p>
                    <div className="flex justify-between text-xs">
                      <div>
                        <p className="text-white/40 mb-0.5">Владелец</p>
                        <p className="text-white/80 uppercase truncate max-w-[140px]">
                          {cardName || 'ИМЯ ФАМИЛИЯ'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/40 mb-0.5">Срок</p>
                        <p className="text-white/80 font-mono">{expiry || 'MM/YY'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Имя на карте</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      placeholder="IVAN IVANOV"
                      className={paymentInputClass}
                      autoComplete="cc-name"
                    />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Номер карты</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      className={paymentInputClass}
                      autoComplete="cc-number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block">Срок действия</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        className={paymentInputClass}
                        autoComplete="cc-exp"
                      />
                    </div>
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block">CVV</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="•••"
                        className={paymentInputClass}
                        autoComplete="cc-csc"
                      />
                    </div>
                  </div>
                </div>
              )}

              {method === 'idram' && (
                <div className="space-y-4 mb-5">
                  <div
                    className="rounded-2xl p-5 text-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,107,0,0.2), rgba(255,107,0,0.05))',
                      border: '1px solid rgba(255,107,0,0.35)',
                    }}
                  >
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #ff6b00, #e85d00)' }}>
                      iD
                    </div>
                    <p className="text-white font-semibold">Idram Wallet</p>
                    <p className="text-white/50 text-xs mt-1">Мгновенный перевод с кошелька Idram</p>
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Номер телефона Idram</label>
                    <input
                      type="tel"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      placeholder="+374 XX XXX XXX"
                      className={paymentInputClass}
                    />
                  </div>
                </div>
              )}

              {method === 'telcell' && (
                <div className="space-y-4 mb-5">
                  <div
                    className="rounded-2xl p-5 text-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,122,255,0.2), rgba(0,122,255,0.05))',
                      border: '1px solid rgba(0,122,255,0.35)',
                    }}
                  >
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #007aff, #0056b3)' }}>
                      <i className="ti ti-device-mobile text-white text-2xl" />
                    </div>
                    <p className="text-white font-semibold">Telcell Wallet</p>
                    <p className="text-white/50 text-xs mt-1">Оплата через приложение Telcell</p>
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">Номер телефона Telcell</label>
                    <input
                      type="tel"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      placeholder="+374 XX XXX XXX"
                      className={paymentInputClass}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-white/35 text-xs mb-4">
                <i className="ti ti-lock text-sm" />
                <span>256-bit SSL · Данные защищены</span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={!canPay}
                  className="btn-accent w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handlePay}
                >
                  {method === 'card'
                    ? `Оплатить ${amd.toLocaleString('ru-RU')} AMD`
                    : method === 'idram'
                      ? 'Оплатить через Idram'
                      : 'Оплатить через Telcell'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  style={{ ...dealBtn.dispute, width: '100%', flex: 'unset' }}
                >
                  Отмена
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="py-10 px-4 text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div
                  className="absolute inset-0 rounded-full border-2 border-white/10"
                  aria-hidden
                />
                <div
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-primary,#9333ea)] animate-spin"
                  aria-hidden
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="ti ti-credit-card text-white/60 text-xl" />
                </div>
              </div>
              <h2 className="text-white text-lg font-bold mb-2">Обработка платежа</h2>
              <p className="text-white/50 text-sm mb-1">Пожалуйста, не закрывайте окно</p>
              <p className="text-white/30 text-xs">
                {amd.toLocaleString('ru-RU')} AMD ·{' '}
                {method === 'card' ? 'Банковская карта' : method === 'idram' ? 'Idram' : 'Telcell'}
              </p>
              <div className="flex justify-center gap-1.5 mt-6">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/30 animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 px-4 text-center">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '2px solid rgba(34,197,94,0.4)',
                }}
              >
                <i className="ti ti-check text-green-400 text-4xl" />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">Оплата прошла успешно</h2>
              <p className="text-white/50 text-sm mb-4">
                {amd.toLocaleString('ru-RU')} AMD списано с вашего счёта
              </p>
              <div
                className="rounded-xl py-3 px-4 mb-6 text-left text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div className="flex justify-between text-white/50 mb-1">
                  <span>Статус</span>
                  <span className="text-green-400">Подтверждено</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Сумма</span>
                  <span className="text-white/80">{amd.toLocaleString('ru-RU')} AMD</span>
                </div>
              </div>
              {saving ? (
                <p className="text-white/40 text-sm flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  Завершаем заказ...
                </p>
              ) : (
                <p className="text-green-400/80 text-sm">Заказ будет завершён автоматически</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function AdvertiserDealActions({
  request,
  channel,
  userId,
  onUpdate,
  showDetails = true,
}: {
  request: any
  channel?: any
  userId: string
  onUpdate: (patch: Record<string, unknown>) => void
  showDetails?: boolean
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [advertiserNote, setAdvertiserNote] = useState(request.advertiser_note || '')
  const [showReview, setShowReview] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const status = normalizeDealStatus(request.status)

  const patch = async (data: Record<string, unknown>) => {
    setSaving(true)
    const payload = { ...data, updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from('ad_requests')
      .update(payload)
      .eq('id', request.id)
      .eq('advertiser_id', userId)
    setSaving(false)
    if (error) return false
    onUpdate(payload)
    return true
  }

  const submitReview = async (rating: number, comment: string) => {
    const revieweeId = channel?.owner_id
    if (!revieweeId) {
      setReviewError('Не найден владелец канала')
      return
    }
    setReviewError('')
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: userId,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim(),
      deal_id: request.id,
    })
    if (error) {
      setReviewError(error.message)
      return
    }
    setReviewDone(true)
    setShowReview(false)
  }

  const confirmPayment = async () => {
    const ok = await patch({ status: 'completed', completed_at: new Date().toISOString() })
    if (ok) {
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'deal_completed',
            channelId: request.channel_id,
            dealId: request.id,
            advertiserName: request.advertiser_name,
            budget: request.budget,
          }),
        })
      } catch {
        console.log('Notification failed silently')
      }
    }
    return ok
  }

  return (
    <div>
      <DealPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={async () => {
          const ok = await confirmPayment()
          if (ok) setShowPaymentModal(false)
        }}
        budget={request.budget}
        channel={channel}
        saving={saving}
      />
      {showDetails && (
        <div className="space-y-3 text-sm mb-4">
          {channel && (
            <div>
              <div className="text-white/50 mb-1">Канал</div>
              <p className="text-white/80">
                {channel.name} (@{channel.telegram_username})
              </p>
            </div>
          )}
          <div>
            <div className="text-white/50 mb-1">Сообщение</div>
            <p className="text-white/80">{request.message}</p>
          </div>
          <div>
            <div className="text-white/50 mb-1">Бюджет</div>
            <p className="text-price-accent">{formatAmdWithUsd(request.budget)}</p>
          </div>
        </div>
      )}

      <ProgressTracker steps={getAdvertiserSteps(request.status)} />

      {status === 'new' && !request.campaign_id && (
        <p className="text-white/50 text-sm mt-2">Ожидает подтверждения оплаты</p>
      )}

      {status === 'payment_pending' && !request.campaign_id && (
        <div style={{ marginTop: '12px' }}>
          <PaymentReservedBadge />
          <p className="text-white/50 text-sm mt-2">Ожидаем ответа создателя канала</p>
          <button
            type="button"
            disabled={saving}
            style={{ ...dealBtn.reject, marginTop: '16px', width: '100%' }}
            onClick={async () => {
              await patch({ status: 'cancelled', payment_status: 'refunded' })
            }}
          >
            Отменить запрос
          </button>
        </div>
      )}

      {(status === 'new' || status === 'payment_pending') && request.campaign_id && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            type="button"
            disabled={saving}
            style={{ ...dealBtn.accept, opacity: saving ? 0.6 : 1 }}
            onClick={async () => {
              const ok = await patch({ status: 'accepted', accepted_at: new Date().toISOString() })
              if (ok && request.campaign_id) {
                await incrementCampaignSlots(supabase, request.campaign_id)
              }
            }}
          >
            ✓ Принять отклик
          </button>
          <button
            type="button"
            disabled={saving}
            style={{ ...dealBtn.reject, opacity: saving ? 0.6 : 1 }}
            onClick={async () => {
              const ok = await patch({ status: 'rejected' })
              if (ok && request.channel_id) {
                try {
                  await fetch('/api/notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'application_rejected',
                      channelId: request.channel_id,
                      dealId: request.id,
                      advertiserName: request.advertiser_name,
                      budget: request.budget,
                    }),
                  })
                } catch {
                  console.log('Notification failed silently')
                }
              }
            }}
          >
            ✗ Отклонить
          </button>
        </div>
      )}

      {status === 'accepted' && (
        <p className="text-white/60 text-sm mt-2">
          <span style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', marginRight: '8px' }}>
            Принято ✓
          </span>
          Создатель принял заказ и скоро начнёт работу
        </p>
      )}

      {status === 'in_progress' && (
        <p className="text-white/60 text-sm mt-2">
          <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', marginRight: '8px' }}>
            В работе 🔄
          </span>
          Создатель работает над вашим заказом
        </p>
      )}

      {status === 'submitted' && (
        <div>
          <span style={{ background: 'rgba(147,51,234,0.15)', color: '#a78bfa', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
            На проверке 👀
          </span>
          <ProofLinksList links={request.proof_links} />
          {request.creator_note && (
            <p className="text-white/60 text-sm mt-3">
              <span className="text-white/40">Комментарий создателя: </span>
              {request.creator_note}
            </p>
          )}
          <AutoCompleteCountdown updatedAt={request.updated_at || request.created_at} />
          {!showDispute && !showDisputeForm ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
              <button
                type="button"
                disabled={saving}
                style={{ ...dealBtn.confirm, opacity: saving ? 0.6 : 1 }}
                onClick={() => setShowPaymentModal(true)}
              >
                Подтвердить выполнение
              </button>
              <button type="button" style={dealBtn.dispute} onClick={() => setShowDispute(true)}>
                Есть замечания
              </button>
              <button type="button" style={dealBtn.dispute} onClick={() => setShowDisputeForm(true)}>
                Открыть спор
              </button>
            </div>
          ) : showDisputeForm ? (
            <div className="mt-4">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Опишите причину спора..."
                rows={3}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm w-full outline-none focus-accent resize-none mb-3"
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  disabled={saving || !disputeReason.trim()}
                  style={{ ...dealBtn.dispute, flex: 1, opacity: saving || !disputeReason.trim() ? 0.5 : 1 }}
                  onClick={async () => {
                    await patch({ status: 'disputed', dispute_reason: disputeReason.trim() })
                    setShowDisputeForm(false)
                  }}
                >
                  Открыть спор
                </button>
                <button type="button" style={dealBtn.dispute} onClick={() => setShowDisputeForm(false)}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <textarea
                value={advertiserNote}
                onChange={(e) => setAdvertiserNote(e.target.value)}
                placeholder="Опишите замечания..."
                rows={3}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm w-full outline-none focus-accent resize-none mb-3"
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  disabled={saving || !advertiserNote.trim()}
                  style={{ ...dealBtn.submit, flex: 1, opacity: saving || !advertiserNote.trim() ? 0.5 : 1 }}
                  onClick={async () => {
                    await patch({
                      status: 'in_progress',
                      advertiser_note: advertiserNote.trim(),
                    })
                    setShowDispute(false)
                  }}
                >
                  Отправить замечания
                </button>
                <button
                  type="button"
                  style={dealBtn.dispute}
                  onClick={() => setShowDispute(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'completed' && (
        <div>
          <span style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
            Завершено ✅
          </span>
          {request.auto_completed && (
            <span className="text-white/40 text-xs ml-2">(автоподтверждение)</span>
          )}
          {request.completed_at && (
            <p className="text-white/40 text-xs mt-2">
              {new Date(request.completed_at).toLocaleString('ru-RU')}
            </p>
          )}
          <SplitPaymentSummary budget={request.budget} commissionPercent={request.platform_commission || 10} />
          <ProofLinksList links={request.proof_links} />
          {!reviewDone && !showReview && (
            <button
              type="button"
              onClick={() => setShowReview(true)}
              className="border border-white/20 text-white/80 rounded-full px-4 py-2 text-sm mt-4 hover:text-white"
            >
              Оставить отзыв
            </button>
          )}
          {reviewDone && <p className="text-green-400 text-sm mt-4">✓ Отзыв отправлен</p>}
          {showReview && (
            <DealReviewForm onSubmit={submitReview} onCancel={() => setShowReview(false)} error={reviewError} />
          )}
        </div>
      )}

      {status === 'disputed' && (
        <div>
          <DealStatusPill status="disputed" large />
          <p className="text-white/50 text-sm mt-3">Спор открыт. Ожидаем решения администратора.</p>
          {request.dispute_reason && (
            <div className="mt-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <div className="text-orange-400 text-xs mb-1">Причина спора</div>
              <p className="text-white/70 text-sm">{request.dispute_reason}</p>
            </div>
          )}
        </div>
      )}

      {status === 'resolved_creator' && (
        <div>
          <DealStatusPill status="resolved_creator" large />
          <SplitPaymentSummary budget={request.budget} commissionPercent={request.platform_commission || 10} />
        </div>
      )}

      {status === 'resolved_advertiser' && (
        <div>
          <DealStatusPill status="resolved_advertiser" large />
          <RefundSummary budget={request.budget} />
        </div>
      )}

      {status === 'cancelled' && (
        <div>
          <DealStatusPill status="cancelled" large />
          <RefundSummary budget={request.budget} />
        </div>
      )}

      {status === 'rejected' && (
        <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
          Отклонено ✗
        </span>
      )}
    </div>
  )
}

export function CreatorDealCard({
  request,
  channelMap,
  userId,
  onUpdate,
  linkToDeal = false,
}: {
  request: any
  channelMap: Record<string, any>
  userId: string
  onUpdate: (id: string, patch: Record<string, unknown>) => void
  linkToDeal?: boolean
}) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const channel = channelMap[request.channel_id]
  const status = normalizeDealStatus(request.status)

  useEffect(() => {
    if (!expanded || !userId) return
    markDealViewed(supabase, request.id, 'creator')
  }, [expanded, request.id, userId, supabase])

  return (
    <div
      style={{
        ...glassDealCard,
        overflow: 'hidden',
        marginBottom: '16px',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center gap-4 text-left hover:bg-white/5 transition"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            background:
              status === 'completed'
                ? '#22c55e'
                : status === 'rejected'
                  ? '#ef4444'
                  : 'var(--accent-primary, #9333ea)',
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-white font-bold truncate">{request.advertiser_name}</div>
            <DealStatusPill status={request.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
            <span className="text-price-accent">{formatAmdWithUsd(request.budget)}</span>
            <span className="text-white/40">{new Date(request.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
        <span className="text-white/40">→</span>
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-5">
          {linkToDeal && (
            <Link href={`/dashboard/deal/${request.id}`} className="text-accent text-xs mb-4 inline-block hover:underline">
              Открыть страницу сделки →
            </Link>
          )}
          <CreatorDealActions
            request={request}
            channel={channel}
            userId={userId}
            onUpdate={(patch) => onUpdate(request.id, patch)}
          />
          {request.status !== 'new' && request.status !== 'rejected' && userId && (
            <div style={{ marginTop: '16px' }}>
              <DealChat dealId={request.id} currentUserId={userId} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AdvertiserDealCard({
  request,
  channelMap,
  userId,
  onUpdate,
  linkToDeal = false,
}: {
  request: any
  channelMap: Record<string, any>
  userId: string
  onUpdate: (id: string, patch: Record<string, unknown>) => void
  linkToDeal?: boolean
}) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const channel = channelMap[request.channel_id]
  const status = normalizeDealStatus(request.status)

  useEffect(() => {
    if (!expanded || !userId) return
    markDealViewed(supabase, request.id, 'advertiser')
  }, [expanded, request.id, userId, supabase])

  return (
    <div style={{ ...glassDealCard, overflow: 'hidden', marginBottom: '16px' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center gap-4 text-left hover:bg-white/5 transition"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            background:
              status === 'completed'
                ? '#22c55e'
                : status === 'rejected'
                  ? '#ef4444'
                  : 'var(--accent-primary, #9333ea)',
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-white font-bold truncate">{channel?.name || 'Канал'}</div>
            <DealStatusPill status={request.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
            <span className="text-price-accent">{formatAmdWithUsd(request.budget)}</span>
            <span className="text-white/40">{new Date(request.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
        <span className="text-white/40">→</span>
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-5">
          {linkToDeal && (
            <Link href={`/dashboard/deal/${request.id}`} className="text-accent text-xs mb-4 inline-block hover:underline">
              Открыть страницу сделки →
            </Link>
          )}
          <AdvertiserDealActions
            request={request}
            channel={channel}
            userId={userId}
            onUpdate={(patch) => onUpdate(request.id, patch)}
          />
          {request.status !== 'new' && request.status !== 'rejected' && userId && (
            <div style={{ marginTop: '16px' }}>
              <DealChat dealId={request.id} currentUserId={userId} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DealTimeline({ request }: { request: any }) {
  const status = normalizeDealStatus(request.status)
  const events: { label: string; date?: string; color: string; show: boolean }[] = [
    { label: 'Запрос отправлен', date: request.created_at, color: '#fbbf24', show: true },
    { label: 'Заказ принят', date: request.accepted_at, color: '#4ade80', show: !!request.accepted_at },
    { label: 'Работа начата', date: request.accepted_at, color: '#60a5fa', show: ['in_progress', 'submitted', 'completed'].includes(status) },
    { label: 'Отправлено на проверку', date: request.updated_at, color: '#a78bfa', show: ['submitted', 'completed'].includes(status) },
    { label: 'Заказ завершён', date: request.completed_at, color: '#22c55e', show: status === 'completed' && !!request.completed_at },
  ]

  return (
    <div style={{ position: 'relative', paddingLeft: '32px' }}>
      <div
        style={{
          position: 'absolute',
          left: '11px',
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'rgba(255,255,255,0.1)',
        }}
      />
      {events
        .filter((e) => e.show)
        .map((event, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: '24px' }}>
            <div
              style={{
                position: 'absolute',
                left: '-21px',
                top: '4px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: event.color,
              }}
            />
            <div className="text-white text-sm font-medium">{event.label}</div>
            {event.date && (
              <div className="text-white/40 text-xs mt-1">
                {new Date(event.date).toLocaleString('ru-RU')}
              </div>
            )}
          </div>
        ))}
    </div>
  )
}
