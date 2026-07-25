import { Fragment } from 'react'
import { statusBadge } from './admin-utils'

type AdminRequestsProps = {
  requests: any[]
  requestSearch: string
  requestStatusFilter: string
  expandedRequest: string | null
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onExpandRequest: (id: string | null) => void
  onApprove: (id: string) => void
  onDelete: (id: string) => void
}

export default function AdminRequests({
  requests,
  requestSearch,
  requestStatusFilter,
  expandedRequest,
  onSearchChange,
  onStatusFilterChange,
  onExpandRequest,
  onApprove,
  onDelete,
}: AdminRequestsProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">Запросы на рекламу</h1>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Поиск по рекламодателю..."
          value={requestSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none text-sm flex-1 min-w-[200px]"
        />
        <select
          value={requestStatusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
        >
          <option value="all">Все</option>
          <option value="new">New</option>
          <option value="replied">Replied</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {[
                'Рекламодатель',
                'Контакт',
                'Бюджет',
                'Сообщение',
                'Статус',
                'Дата',
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
            {requests.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-b border-white/5 hover:bg-white/[0.03] transition">
                  <td className="px-4 py-3 text-white text-sm">{r.advertiser_name || '—'}</td>
                  <td className="px-4 py-3 text-white/50 text-sm truncate max-w-[100px]">
                    {r.advertiser_contact}
                  </td>
                  <td className="px-4 py-3 text-white text-sm">${r.budget}</td>
                  <td className="px-4 py-3 text-white/50 text-sm">
                    {(r.message || '').slice(0, 50)}
                    {(r.message || '').length > 50 ? '...' : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(r.status)}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-sm">
                    {new Date(r.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onExpandRequest(expandedRequest === r.id ? null : r.id)
                        }
                        className="bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs"
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        onClick={() => onApprove(r.id)}
                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20 rounded-lg px-2 py-1 text-xs"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(r.id)}
                        className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRequest === r.id && (
                  <tr key={`${r.id}-detail`} className="bg-white/[0.02]">
                    <td colSpan={7} className="px-4 py-4 text-white/70 text-sm whitespace-pre-wrap">
                      {r.message || 'Нет сообщения'}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
