import { createElement } from 'react'

export function statusBadge(status: string) {
  const map: Record<string, string> = {
    verified: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    rejected: 'bg-red-500/20 text-red-400',
    active: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-purple-500/20 text-purple-400',
    new: 'bg-orange-500/20 text-orange-400',
    replied: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
  }
  return `px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-white/10 text-white/50'}`
}

export function Stars({ rating }: { rating: number }) {
  return createElement(
    'span',
    { className: 'text-yellow-400 text-sm' },
    '★'.repeat(Math.round(rating)),
    '☆'.repeat(5 - Math.round(rating)),
  )
}
