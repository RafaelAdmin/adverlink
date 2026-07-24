/*
Run in Supabase SQL Editor:
alter table ad_requests add column if not exists proof_links text[];
alter table ad_requests add column if not exists creator_note text;
alter table ad_requests add column if not exists advertiser_note text;
alter table ad_requests add column if not exists accepted_at timestamp with time zone;
alter table ad_requests add column if not exists completed_at timestamp with time zone;
alter table ad_requests add column if not exists posts_count integer default 1;
*/

export type DealStatus =
  | 'new'
  | 'accepted'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'rejected'
  | 'disputed'

export function normalizeDealStatus(status: string): DealStatus {
  if (status === 'replied') return 'in_progress'
  if (status === 'cancelled') return 'rejected'
  return status as DealStatus
}

export function getDealStatusBadge(status: string) {
  const s = normalizeDealStatus(status)
  const map: Record<DealStatus, { label: string; bg: string; color: string }> = {
    new: { label: 'Новый', bg: 'rgba(234,179,8,0.15)', color: '#fbbf24' },
    accepted: { label: 'Принят', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    in_progress: { label: 'В работе', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    submitted: { label: 'На проверке', bg: 'rgba(147,51,234,0.15)', color: '#a78bfa' },
    completed: { label: 'Завершён', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    rejected: { label: 'Отклонён', bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    disputed: { label: 'Спор', bg: 'rgba(249,115,22,0.15)', color: '#fb923c' },
  }
  return map[s] || map.new
}

export function getOrderStatusBadge(status: string) {
  const b = getDealStatusBadge(status)
  const classMap: Record<string, string> = {
    new: 'bg-yellow-500/20 text-yellow-400',
    accepted: 'bg-green-500/20 text-green-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    submitted: 'bg-purple-500/20 text-purple-400',
    completed: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    disputed: 'bg-orange-500/20 text-orange-400',
  }
  const s = normalizeDealStatus(status)
  return { label: b.label, className: classMap[s] || classMap.new }
}

export function statusBadge(status: string) {
  const b = getOrderStatusBadge(status)
  return { label: b.label, cls: b.className }
}

export function canLeaveReview(status: string) {
  return normalizeDealStatus(status) === 'completed'
}

export function getCreatorSteps(status: string) {
  const s = normalizeDealStatus(status)
  return [
    { label: 'Получен', done: true },
    { label: 'Принят', done: s !== 'new' && s !== 'rejected' },
    { label: 'В работе', done: ['in_progress', 'submitted', 'completed', 'disputed'].includes(s) },
    { label: 'На проверке', done: ['submitted', 'completed'].includes(s) },
    { label: 'Завершён', done: s === 'completed' },
  ]
}

export function getAdvertiserSteps(status: string) {
  const s = normalizeDealStatus(status)
  return [
    { label: 'Отправлен', done: true },
    { label: 'Принят', done: !['new', 'rejected'].includes(s) },
    { label: 'В работе', done: ['in_progress', 'submitted', 'completed'].includes(s) },
    { label: 'На проверке', done: ['submitted', 'completed'].includes(s) },
    { label: 'Завершён', done: s === 'completed' },
  ]
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
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)',
    borderRadius: '14px',
    padding: '12px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    flex: 1,
  },
}
