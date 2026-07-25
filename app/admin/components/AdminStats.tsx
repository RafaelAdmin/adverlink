type OverviewStats = {
  users: number
  channels: number
  pendingChannels: number
  campaigns: number
  requests: number
  reviews: number
}

type AdminStatsProps = {
  stats: OverviewStats
  onNavigateToChannels?: () => void
}

export default function AdminStats({ stats, onNavigateToChannels }: AdminStatsProps) {
  const statCards = [
    { label: 'Пользователи', value: stats.users, icon: '👥', color: 'text-blue-400' },
    { label: 'Каналов', value: stats.channels, icon: '📺', color: 'text-purple-400' },
    {
      label: 'На верификации',
      value: stats.pendingChannels,
      icon: '⏳',
      color: 'text-yellow-400',
      onClick: onNavigateToChannels,
    },
    { label: 'Кампаний', value: stats.campaigns, icon: '📋', color: 'text-green-400' },
    { label: 'Запросов', value: stats.requests, icon: '📨', color: 'text-orange-400' },
    { label: 'Отзывов', value: stats.reviews, icon: '⭐', color: 'text-pink-400' },
  ]

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {statCards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={card.onClick}
          className={`bg-white/5 border border-white/10 rounded-2xl p-6 relative text-left transition hover:border-white/20 ${
            card.onClick ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          <span className={`text-4xl opacity-20 absolute right-4 top-4 ${card.color}`}>
            {card.icon}
          </span>
          <div className="text-3xl font-bold text-white mb-1">{card.value}</div>
          <div className="text-white/50 text-sm">{card.label}</div>
        </button>
      ))}
    </div>
  )
}
