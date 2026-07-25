type AdminModerationProps = {
  channels: any[]
  onVerify: (id: string) => void
  onReject: (id: string) => void
}

export default function AdminModeration({ channels, onVerify, onReject }: AdminModerationProps) {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Каналы на верификации</h1>
        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
          {channels.length}
        </span>
      </div>
      {channels.length === 0 ? (
        <div className="text-green-400 text-center py-12 text-lg">✓ Все каналы проверены</div>
      ) : (
        channels.map((ch) => (
          <div
            key={ch.id}
            className="bg-white/5 border border-yellow-500/20 rounded-2xl p-6 mb-4"
          >
            <div className="flex items-start gap-4 mb-4">
              {ch.avatar_url ? (
                <img src={ch.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {ch.name?.[0]}
                </div>
              )}
              <div className="flex-1">
                <div className="text-white font-bold text-lg">{ch.name}</div>
                <div className="text-white/40 text-sm">@{ch.telegram_username}</div>
                <div className="text-white/50 text-sm mt-1">
                  {ch.subscriber_count?.toLocaleString()} подписчиков
                </div>
              </div>
            </div>
            {ch.description && (
              <p className="text-white/60 text-sm mb-3">{ch.description}</p>
            )}
            <div className="text-white/40 text-xs mb-2">
              Владелец: {ch.owner_id?.slice(0, 8)}... · Добавлен:{' '}
              {new Date(ch.created_at).toLocaleDateString('ru-RU')}
            </div>
            {ch.telegram_username && (
              <a
                href={`https://t.me/${ch.telegram_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-sm hover:underline mb-4 inline-block"
              >
                Открыть в Telegram →
              </a>
            )}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => onVerify(ch.id)}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-sm transition"
              >
                ✓ ВЕРИФИЦИРОВАТЬ
              </button>
              <button
                type="button"
                onClick={() => onReject(ch.id)}
                className="flex-1 border-2 border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold py-3 rounded-xl text-sm transition"
              >
                ✗ ОТКЛОНИТЬ
              </button>
            </div>
          </div>
        ))
      )}
    </>
  )
}
