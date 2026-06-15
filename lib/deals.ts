export function getOrderStatusBadge(status: string) {
  if (status === 'completed') {
    return { label: 'Завершён', className: 'bg-blue-500/20 text-blue-400' }
  }
  if (status === 'replied') {
    return { label: 'Отвечено', className: 'bg-green-500/20 text-green-400' }
  }
  if (status === 'cancelled') {
    return { label: 'Отменён', className: 'bg-white/10 text-white/40' }
  }
  return { label: 'Новый', className: 'bg-orange-500/20 text-orange-400' }
}

export function statusBadge(status: string) {
  const b = getOrderStatusBadge(status)
  return { label: b.label, cls: b.className }
}

export function canMarkReplied(status: string) {
  return status === 'new'
}

export function canMarkCompleted(status: string) {
  return status === 'replied'
}

export function canLeaveReview(status: string) {
  return status === 'completed'
}

export function getCreatorSteps(status: string) {
  return [
    { label: 'Получен', done: true },
    { label: 'Просмотрен', done: status !== 'new' },
    { label: 'Отвечено', done: status === 'replied' || status === 'completed' },
    { label: 'Завершён', done: status === 'completed' },
  ]
}

export function getAdvertiserSteps(status: string) {
  return [
    { label: 'Отправлен', done: true },
    { label: 'Просмотрен', done: status !== 'new' },
    { label: 'Отвечено', done: status === 'replied' || status === 'completed' },
    { label: 'Размещено', done: status === 'completed' },
  ]
}
