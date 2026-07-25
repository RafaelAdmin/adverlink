import { statusBadge } from './admin-utils'

type AdminChannelsProps = {
  channels: any[]
  channelSearch: string
  channelVerificationFilter: string
  channelActiveFilter: string
  onSearchChange: (value: string) => void
  onVerificationFilterChange: (value: string) => void
  onActiveFilterChange: (value: string) => void
  onVerify: (id: string) => void
  onReject: (id: string) => void
  onToggleActive: (channel: any) => void
  onDelete: (id: string) => void
}

export default function AdminChannels({
  channels,
  channelSearch,
  channelVerificationFilter,
  channelActiveFilter,
  onSearchChange,
  onVerificationFilterChange,
  onActiveFilterChange,
  onVerify,
  onReject,
  onToggleActive,
  onDelete,
}: AdminChannelsProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">Каналы</h1>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Поиск по названию или username..."
          value={channelSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none text-sm flex-1 min-w-[200px]"
        />
        <select
          value={channelVerificationFilter}
          onChange={(e) => onVerificationFilterChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
        >
          <option value="all">Все статусы</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={channelActiveFilter}
          onChange={(e) => onActiveFilterChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
        >
          <option value="all">Все</option>
          <option value="active">Активные</option>
          <option value="inactive">Неактивные</option>
        </select>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                {[
                  '',
                  'Канал',
                  'Владелец',
                  'Подписчиков',
                  'Цена',
                  'Верификация',
                  'Активен',
                  'Действия',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                  <td className="px-4 py-3">
                    {ch.avatar_url ? (
                      <img src={ch.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {ch.name?.[0]}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white text-sm font-medium">{ch.name}</div>
                    <div className="text-white/40 text-xs">@{ch.telegram_username}</div>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs font-mono">
                    {ch.owner_id?.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-white text-sm">
                    {ch.subscriber_count?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-white text-sm">${ch.ad_price || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(ch.verification_status || 'pending')}>
                      {ch.verification_status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full inline-block ${
                        ch.is_active !== false ? 'bg-green-400' : 'bg-gray-500'
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onVerify(ch.id)}
                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20 rounded-lg px-2 py-1 text-xs"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(ch.id)}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 rounded-lg px-2 py-1 text-xs"
                      >
                        ✗
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleActive(ch)}
                        className="bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs"
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(ch.id)}
                        className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
