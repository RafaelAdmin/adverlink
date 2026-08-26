/*
Run in Supabase SQL Editor:

alter table campaigns add column if not exists slots_total integer default 1;
alter table campaigns add column if not exists slots_filled integer default 0;
alter table campaigns add column if not exists preferred_social_networks text[];
alter table campaigns add column if not exists collection_deadline timestamp with time zone;
alter table campaigns add column if not exists brief text;

alter table ad_requests add column if not exists payment_status text default 'pending';
alter table ad_requests add column if not exists dispute_reason text;
alter table ad_requests add column if not exists auto_completed boolean default false;
alter table ad_requests add column if not exists platform_commission decimal(5,2) default 10.00;
alter table ad_requests add column if not exists updated_at timestamp with time zone default now();
*/

import type { AdRequest } from '@/lib/database.types'

export type { AdRequest }

export type DealStatus =
  | 'new'
  | 'payment_pending'
  | 'accepted'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'disputed'
  | 'resolved_creator'
  | 'resolved_advertiser'

export const PLATFORM_COMMISSION_PERCENT = 10

export function normalizeDealStatus(status: string): DealStatus {
  if (status === 'replied') return 'in_progress'
  return status as DealStatus
}

export function getDealStatusBadge(status: string) {
  const s = normalizeDealStatus(status)
  const map: Record<DealStatus, { label: string; bg: string; color: string }> = {
    new: { label: 'Новый', bg: 'rgba(234,179,8,0.15)', color: '#fbbf24' },
    payment_pending: { label: 'Beta: ожидает ответа', bg: 'rgba(234,179,8,0.2)', color: '#fbbf24' },
    accepted: { label: 'Принят', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    in_progress: { label: 'В работе', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    submitted: { label: 'На проверке', bg: 'rgba(147,51,234,0.15)', color: '#a78bfa' },
    completed: { label: 'Завершён', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    rejected: { label: 'Отклонён', bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    cancelled: { label: 'Отменён', bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    disputed: { label: 'Спор', bg: 'rgba(249,115,22,0.2)', color: '#fb923c' },
    resolved_creator: { label: '✓ В пользу создателя', bg: 'rgba(34,197,94,0.2)', color: '#4ade80' },
    resolved_advertiser: { label: 'В пользу рекламодателя', bg: 'rgba(239,68,68,0.2)', color: '#f87171' },
  }
  return map[s] || map.new
}

export function getOrderStatusBadge(status: string) {
  const b = getDealStatusBadge(status)
  const classMap: Record<string, string> = {
    new: 'bg-yellow-500/20 text-yellow-400',
    payment_pending: 'bg-yellow-500/20 text-yellow-400',
    accepted: 'bg-green-500/20 text-green-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    submitted: 'bg-purple-500/20 text-purple-400',
    completed: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-red-500/20 text-red-400',
    disputed: 'bg-orange-500/20 text-orange-400',
    resolved_creator: 'bg-green-500/20 text-green-400',
    resolved_advertiser: 'bg-red-500/20 text-red-400',
  }
  const s = normalizeDealStatus(status)
  return { label: b.label, className: classMap[s] || classMap.new }
}

export function statusBadge(status: string) {
  const b = getOrderStatusBadge(status)
  return { label: b.label, cls: b.className }
}

export function canLeaveReview(status: string) {
  const s = normalizeDealStatus(status)
  return s === 'completed' || s === 'resolved_creator'
}

export function getCreatorSteps(status: string) {
  const s = normalizeDealStatus(status)
  const pastNew = !['new', 'rejected', 'cancelled'].includes(s)
  return [
    { label: 'Получен', done: true },
    { label: 'Заявка', done: ['payment_pending', 'accepted', 'in_progress', 'submitted', 'completed', 'disputed', 'resolved_creator', 'resolved_advertiser'].includes(s) },
    { label: 'Принят', done: pastNew && s !== 'payment_pending' },
    { label: 'В работе', done: ['in_progress', 'submitted', 'completed', 'disputed', 'resolved_creator', 'resolved_advertiser'].includes(s) },
    { label: 'Завершён', done: ['completed', 'resolved_creator', 'resolved_advertiser'].includes(s) },
  ]
}

export function getAdvertiserSteps(status: string) {
  const s = normalizeDealStatus(status)
  return [
    { label: 'Отправлен', done: true },
    { label: 'Заявка', done: s !== 'new' },
    { label: 'Принят', done: !['new', 'payment_pending', 'rejected', 'cancelled'].includes(s) },
    { label: 'На проверке', done: ['submitted', 'completed', 'disputed', 'resolved_creator', 'resolved_advertiser'].includes(s) },
    { label: 'Завершён', done: ['completed', 'resolved_creator', 'resolved_advertiser'].includes(s) },
  ]
}

export function calcPaymentSplit(budget: number | null | undefined, commissionPercent = PLATFORM_COMMISSION_PERCENT) {
  const total = Number(budget) || 0
  const platform = Math.round(total * (commissionPercent / 100))
  const creator = total - platform
  return { total, platform, creator, commissionPercent }
}

export function getAutoCompleteDeadline(updatedAt: string | null | undefined) {
  if (!updatedAt) return null
  return new Date(new Date(updatedAt).getTime() + 72 * 60 * 60 * 1000)
}

export function getAutoCompleteCountdown(updatedAt: string | null | undefined) {
  const deadline = getAutoCompleteDeadline(updatedAt)
  if (!deadline) return null
  const ms = deadline.getTime() - Date.now()
  if (ms <= 0) return { hours: 0, minutes: 0, expired: true, urgent: true }
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return { hours, minutes, expired: false, urgent: hours < 12 }
}

/** @deprecated use new deal flow */
export function canMarkReplied(status: string) {
  return normalizeDealStatus(status) === 'new'
}

/** @deprecated use new deal flow */
export function canMarkCompleted(status: string) {
  return normalizeDealStatus(status) === 'submitted'
}

export const glassDealCard = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '20px',
} as const

export const dealBtn = {
  accept: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    flex: 1,
  },
  reject: {
    background: 'transparent',
    border: '1px solid #dc2626',
    color: '#f87171',
    borderRadius: '14px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    flex: 1,
  },
  submit: {
    background: 'var(--accent-primary, #9333ea)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    width: '100%',
  },
  confirm: {
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    flex: 1,
  },
  dispute: {
    background: 'transparent',
    border: '1px solid rgba(239,68,68,0.5)',
    color: '#f87171',
    borderRadius: '14px',
    padding: '12px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    flex: 1,
  },
}
