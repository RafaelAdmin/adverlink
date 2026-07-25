import AdminStats from './AdminStats'
import { statusBadge } from './admin-utils'

type OverviewStats = {
  users: number
  channels: number
  pendingChannels: number
  campaigns: number
  requests: number
  reviews: number
}

type AdminOverviewProps = {
  stats: OverviewStats
  recentRequests: any[]
  onNavigateToChannels?: () => void
  onDeleteRequest: (id: string) => void
}

export default function AdminOverview({
  stats,
  recentRequests,
  onNavigateToChannels,
  onDeleteRequest,
}: AdminOverviewProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">Обзор платформы</h1>
      <AdminStats stats={stats} onNavigateToChannels={onNavigateToChannels} />

      <h2 className="text-white font-semibold mb-4">Последняя активность</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                Рекламодатель
              </th>
              <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                Бюджет
              </th>
              <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                Статус
              </th>
              <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                Дата
              </th>
              <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                Действия
              </th>
            </tr>
          </thead>
          <tbody>
            {recentRequests.map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                <td className="px-4 py-3 text-white text-sm">{r.advertiser_name || '—'}</td>
                <td className="px-4 py-3 text-white text-sm">${r.budget}</td>
                <td className="px-4 py-3">
                  <span className={statusBadge(r.status)}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-white/50 text-sm">
                  {new Date(r.created_at).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onDeleteRequest(r.id)}
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
