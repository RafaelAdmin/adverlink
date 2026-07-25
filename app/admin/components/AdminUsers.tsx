type AdminUsersProps = {
  profiles: any[]
  userSearch: string
  userPage: number
  totalUserPages: number
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  onToggleAdmin: (profile: any) => void
  onDelete: (profile: any) => void
  onCopyId: (id: string) => void
}

export default function AdminUsers({
  profiles,
  userSearch,
  userPage,
  totalUserPages,
  onSearchChange,
  onPageChange,
  onToggleAdmin,
  onDelete,
  onCopyId,
}: AdminUsersProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">Пользователи</h1>
      <input
        type="text"
        placeholder="Поиск по имени или ID..."
        value={userSearch}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-red-500/50 transition text-sm w-full max-w-md mb-6"
      />
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                {['', 'ID', 'Имя', 'Email / ID', 'Дата', 'План', 'Уровень', 'Админ', 'Действия'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                  <td className="px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/30 flex items-center justify-center text-white text-sm font-bold">
                      {(p.full_name || p.id)?.[0]?.toUpperCase()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onCopyId(p.id)}
                      className="text-white/50 text-xs font-mono hover:text-white transition"
                      title="Копировать ID"
                    >
                      {p.id.slice(0, 8)}...
                    </button>
                  </td>
                  <td className="px-4 py-3 text-white text-sm">{p.full_name || '—'}</td>
                  <td className="px-4 py-3 text-white/50 text-xs font-mono">{p.id.slice(0, 12)}...</td>
                  <td className="px-4 py-3 text-white/50 text-sm">
                    {new Date(p.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded-full text-xs">
                      {(p.subscription_plan || 'free').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
                      Lv.{p.level || 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onToggleAdmin(p)}
                      className="relative w-10 h-5 rounded-full transition-colors"
                      style={{
                        background: p.is_admin ? '#ef4444' : 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                        style={{ transform: p.is_admin ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onDelete(p)}
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
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={userPage === 0}
          onClick={() => onPageChange(userPage - 1)}
          className="border border-white/20 text-white/70 disabled:opacity-30 rounded-lg px-4 py-2 text-sm"
        >
          ← Назад
        </button>
        <span className="text-white/50 text-sm">
          Стр. {userPage + 1} из {Math.max(1, totalUserPages)}
        </span>
        <button
          type="button"
          disabled={userPage >= totalUserPages - 1}
          onClick={() => onPageChange(userPage + 1)}
          className="border border-white/20 text-white/70 disabled:opacity-30 rounded-lg px-4 py-2 text-sm"
        >
          Вперёд →
        </button>
      </div>
    </>
  )
}
