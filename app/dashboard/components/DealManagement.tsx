'use client'

import { useEffect, useState } from 'react'
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
import { formatAmdWithUsd } from '@/lib/currency'
import DealChat from './DealChat'
import BetaPaymentNoticeModal from './BetaPaymentNoticeModal'
import { AutoCompleteCountdown, PaymentReservedBadge, RefundSummary, SplitPaymentSummary } from './DealExtras'
import { markDealViewed } from '@/lib/notifications'
import {
  applyDealApiPatch,
  postConfirmCompletion,
  postDealDispute,
  postDealTransition,
  postRequestRevision,
} from '@/lib/deal-api-client'

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
    let ok = false

    if (typeof data.status === 'string') {
      const result = await postDealTransition(request.id, {
        toStatus: data.status as never,
        postsCount: typeof data.posts_count === 'number' ? data.posts_count : undefined,
        proofLinks: Array.isArray(data.proof_links) ? (data.proof_links as string[]) : undefined,
        creatorNote: typeof data.creator_note === 'string' ? data.creator_note : undefined,
        paymentStatus: typeof data.payment_status === 'string' ? data.payment_status : undefined,
      })
      ok = applyDealApiPatch(onUpdate, result)
    } else {
      ok = false
    }

    setSaving(false)
    return ok
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
              const ok = await patch({
                status: 'submitted',
                proof_links: links,
                creator_note: creatorNote.trim() || null,
              })
              if (ok && request.channel_id) {
                for (const link of links) {
                  if (!link.includes('t.me/') && !link.includes('telegram.me/')) continue
                  try {
                    await fetch('/api/telegram/analytics/associate-post', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ dealId: request.id, postUrl: link }),
                    })
                  } catch {
                    /* association is best-effort in V1 */
                  }
                }
              }
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

export function DealPaymentModal({
  open,
  onClose,
  onConfirm,
  budget,
  saving,
  title = 'Подтверждение заявки',
  subtitle = 'Beta: оплата согласуется напрямую между сторонами',
  confirmLabel = 'Подтвердить',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void | boolean>
  budget: number | string | null | undefined
  channel?: any
  saving?: boolean
  title?: string
  subtitle?: string
  confirmLabel?: string
}) {
  return (
    <BetaPaymentNoticeModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      budget={budget}
      saving={saving}
      title={title}
      subtitle={subtitle}
      confirmLabel={confirmLabel}
    />
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
    let ok = false

    if (typeof data.status === 'string') {
      const status = data.status as string
      if (status === 'completed') {
        const result = await postConfirmCompletion(request.id)
        ok = applyDealApiPatch(onUpdate, result)
      } else if (status === 'disputed') {
        const result = await postDealDispute(request.id, String(data.dispute_reason || ''))
        ok = applyDealApiPatch(onUpdate, result)
      } else if (status === 'in_progress' && data.advertiser_note) {
        const result = await postRequestRevision(request.id, String(data.advertiser_note))
        ok = applyDealApiPatch(onUpdate, result)
      } else {
        const result = await postDealTransition(request.id, {
          toStatus: status as never,
          paymentStatus: typeof data.payment_status === 'string' ? data.payment_status : undefined,
        })
        ok = applyDealApiPatch(onUpdate, result)
      }
    } else {
      ok = false
    }

    setSaving(false)
    return ok
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
    setSaving(true)
    const result = await postConfirmCompletion(request.id)
    const ok = applyDealApiPatch(onUpdate, result)
    setSaving(false)
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
          return ok
        }}
        budget={request.budget}
        channel={channel}
        saving={saving}
        title="Подтвердить выполнение"
        subtitle="Завершение сделки на этапе Beta"
        confirmLabel="Завершить сделку"
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
        <p className="text-white/50 text-sm mt-2">Заявка отправлена — ожидает ответа создателя</p>
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
              await patch({ status: 'accepted' })
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
