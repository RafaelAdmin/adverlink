export function getLevelBadge(deals: number) {
  if (deals >= 100) return { label: 'Diamond', icon: '💎', color: '#60a5fa' }
  if (deals >= 50) return { label: 'Gold', icon: '🥇', color: '#eab308' }
  if (deals >= 10) return { label: 'Silver', icon: '🥈', color: '#94a3b8' }
  return null
}
