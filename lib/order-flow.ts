import { calcPaymentSplit, normalizeDealStatus, PLATFORM_COMMISSION_PERCENT } from '@/lib/deals'
import { isSimulatedPaymentsEnabled, isSimulatedPaymentsEnabledClient } from '@/lib/deal-payments'
import type { DealStatus } from '@/lib/deals'

export type OrderFlowRole = 'advertiser' | 'creator'

export type OrderFlowDeal = {
  status: string
  campaign_id?: string | null
  payment_status?: string | null
  paid_at?: string | null
  accepted_at?: string | null
  auto_completed?: boolean | null
}

/** Marketplace channel-card order — not a campaign application. */
export function isMarketplaceOrderDeal(deal: Pick<OrderFlowDeal, 'campaign_id'>): boolean {
  return !deal.campaign_id
}

export function isOrderPaymentRecorded(deal: Pick<OrderFlowDeal, 'payment_status'>): boolean {
  return deal.payment_status === 'paid'
}

export function isDealChatAvailable(deal: OrderFlowDeal): boolean {
  const status = normalizeDealStatus(deal.status)
  if (status === 'new' || status === 'rejected') return false
  if (status === 'cancelled' && !deal.accepted_at) return false
  return true
}

export function simulatedPaymentsOn(side: 'client' | 'server' = 'client'): boolean {
  return side === 'server' ? isSimulatedPaymentsEnabled() : isSimulatedPaymentsEnabledClient()
}

export function canAdvertiserPayOrder(
  deal: OrderFlowDeal,
  role: OrderFlowRole,
  side: 'client' | 'server' = 'client',
): boolean {
  if (role !== 'advertiser') return false
  if (!simulatedPaymentsOn(side)) return false
  if (normalizeDealStatus(deal.status) !== 'accepted') return false
  return !isOrderPaymentRecorded(deal)
}

export function canCreatorStartExecution(
  deal: OrderFlowDeal,
  role: OrderFlowRole,
  side: 'client' | 'server' = 'client',
): boolean {
  if (role !== 'creator') return false
  if (normalizeDealStatus(deal.status) !== 'accepted') return false
  if (simulatedPaymentsOn(side) && isMarketplaceOrderDeal(deal) && !isOrderPaymentRecorded(deal)) {
    return false
  }
  return true
}

export function canCreatorSubmitCompletion(
  deal: OrderFlowDeal,
  role: OrderFlowRole,
): boolean {
  return role === 'creator' && normalizeDealStatus(deal.status) === 'in_progress'
}

export function canAdvertiserConfirmCompletion(
  deal: OrderFlowDeal,
  role: OrderFlowRole,
): boolean {
  return role === 'advertiser' && normalizeDealStatus(deal.status) === 'submitted'
}

export function canCreatorAcceptMarketplaceOrder(
  deal: OrderFlowDeal,
  role: OrderFlowRole,
): boolean {
  if (role !== 'creator' || !isMarketplaceOrderDeal(deal)) return false
  const status = normalizeDealStatus(deal.status)
  return status === 'new' || status === 'payment_pending'
}

export type OrderProgressStep = {
  id: 'received' | 'accepted' | 'paid' | 'in_progress' | 'completed'
  label: string
  done: boolean
  current: boolean
}

export function isCancelledOrderView(status: string): boolean {
  const s = normalizeDealStatus(status)
  return s === 'rejected' || s === 'cancelled'
}

export function getOrderProgressSteps(
  deal: OrderFlowDeal,
): { cancelled: boolean; steps: OrderProgressStep[] } {
  const status = normalizeDealStatus(deal.status)
  if (isCancelledOrderView(status)) {
    return { cancelled: true, steps: [] }
  }

  const paid = isOrderPaymentRecorded(deal)
  const accepted = !['new', 'payment_pending'].includes(status)
  const working = ['in_progress', 'submitted', 'completed', 'disputed', 'resolved_creator', 'resolved_advertiser'].includes(
    status,
  )
  const submitted = ['submitted', 'completed', 'disputed', 'resolved_creator', 'resolved_advertiser'].includes(status)
  const completed = ['completed', 'resolved_creator'].includes(status)

  const steps: OrderProgressStep[] = [
    { id: 'received', label: 'Заявка получена', done: true, current: status === 'new' || status === 'payment_pending' },
    { id: 'accepted', label: 'Принят', done: accepted, current: status === 'accepted' && !paid },
    { id: 'paid', label: 'Оплачен', done: paid || working, current: status === 'accepted' && paid },
    {
      id: 'in_progress',
      label: 'В работе',
      done: working,
      current: status === 'in_progress' || status === 'submitted',
    },
    { id: 'completed', label: 'Завершён', done: completed, current: completed },
  ]

  if (submitted && status === 'submitted') {
    steps[3].current = true
  }

  return { cancelled: false, steps }
}

export function getOrderFlowStatusLabel(deal: OrderFlowDeal, role: OrderFlowRole): string {
  const status = normalizeDealStatus(deal.status)
  const paid = isOrderPaymentRecorded(deal)

  if (status === 'new' || status === 'payment_pending') {
    return role === 'creator' ? 'Новый запрос' : 'Заявка отправлена'
  }
  if (status === 'accepted' && !paid) {
    return role === 'advertiser' ? 'Заказ принят. Оплатите заказ' : 'Ожидает оплаты рекламодателем'
  }
  if (status === 'accepted' && paid) {
    return role === 'advertiser'
      ? 'Оплата выполнена. Ожидайте выполнения заказа'
      : 'Оплачен. Можно начать выполнение'
  }
  if (status === 'in_progress') return 'В работе'
  if (status === 'submitted') return 'Ожидает подтверждения рекламодателя'
  if (status === 'completed') {
    return deal.auto_completed ? 'Завершён (автоподтверждение)' : 'Завершён'
  }
  if (status === 'rejected') return 'Отклонён'
  if (status === 'cancelled') return 'Отменён'
  if (status === 'disputed') return 'Спор'
  if (status === 'resolved_creator') return 'Завершён'
  if (status === 'resolved_advertiser') return 'Отменён'
  return 'Заявка отправлена'
}

export function getOrderNextStepCopy(deal: OrderFlowDeal, role: OrderFlowRole): string | null {
  const status = normalizeDealStatus(deal.status)
  const paid = isOrderPaymentRecorded(deal)

  if (status === 'new' || status === 'payment_pending') {
    return role === 'creator'
      ? 'Примите или отклоните запрос. Чат откроется после принятия.'
      : 'Заявка отправлена. Чат станет доступен после принятия заказа владельцем канала.'
  }
  if (status === 'accepted' && !paid) {
    return role === 'advertiser' ? 'Оплатите заказ, чтобы создатель мог начать работу.' : 'Ожидайте оплату рекламодателя.'
  }
  if (status === 'accepted' && paid) {
    return role === 'creator' ? 'Начните выполнение заказа.' : 'Ожидайте, пока владелец канала начнёт работу.'
  }
  if (status === 'in_progress') {
    return role === 'creator'
      ? 'После публикации отправьте ссылки на рекламу.'
      : 'Владелец канала выполняет заказ.'
  }
  if (status === 'submitted') {
    return role === 'advertiser'
      ? 'Проверьте ссылки и подтвердите выполнение заказа.'
      : 'Ожидайте подтверждения рекламодателя.'
  }
  if (status === 'completed') return null
  if (status === 'rejected' || status === 'cancelled') return null
  return null
}

export function formatPayoutSplit(
  amount: number | null | undefined,
  commissionPercent = PLATFORM_COMMISSION_PERCENT,
) {
  return calcPaymentSplit(amount, commissionPercent)
}

export const ORDER_CHAT_LOCKED_COPY =
  'Чат станет доступен после принятия заказа владельцем канала.'

export function isTerminalCancelledStatus(status: DealStatus | string): boolean {
  return isCancelledOrderView(status)
}
