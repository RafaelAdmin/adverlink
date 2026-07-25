type PlatformSettings = {
  registrationOpen: boolean
  channelVerification: boolean
  campaignCreation: boolean
}

type PlatformStats = {
  users: number
  verifiedChannels: number
  activeCampaigns: number
  completedDeals: number
  totalRevenue: number
}

type NewCategory = {
  name: string
  slug: string
  icon: string
}

type AdminPlatformProps = {
  categories: any[]
  newCategory: NewCategory
  onNewCategoryChange: (category: NewCategory) => void
  onAddCategory: () => void
  onDeleteCategory: (id: string) => void
  platformStats: PlatformStats
  platformSettings: PlatformSettings
  onPlatformSettingsChange: (settings: PlatformSettings) => void
  onSavePlatformSettings: () => void
}

export default function AdminPlatform({
  categories,
  newCategory,
  onNewCategoryChange,
  onAddCategory,
  onDeleteCategory,
  platformStats,
  platformSettings,
  onPlatformSettingsChange,
  onSavePlatformSettings,
}: AdminPlatformProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6">Настройки платформы</h1>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Категории каналов</h2>
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between py-2 border-b border-white/5"
          >
            <span className="text-white text-sm">
              {cat.icon} {cat.name} ({cat.slug})
            </span>
            <button
              type="button"
              onClick={() => onDeleteCategory(cat.id)}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
            >
              🗑️
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 mt-4">
          <input
            type="text"
            placeholder="Название"
            value={newCategory.name}
            onChange={(e) => onNewCategoryChange({ ...newCategory, name: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm flex-1 min-w-[120px]"
          />
          <input
            type="text"
            placeholder="slug"
            value={newCategory.slug}
            onChange={(e) => onNewCategoryChange({ ...newCategory, slug: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm w-28"
          />
          <input
            type="text"
            placeholder="📁"
            value={newCategory.icon}
            onChange={(e) => onNewCategoryChange({ ...newCategory, icon: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm w-16"
          />
          <button
            type="button"
            onClick={onAddCategory}
            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 rounded-xl px-4 py-2 text-sm"
          >
            Добавить
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Статистика платформы</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-white/50">
            Всего пользователей:{' '}
            <span className="text-white font-bold">{platformStats.users}</span>
          </div>
          <div className="text-white/50">
            Верифицированных каналов:{' '}
            <span className="text-white font-bold">{platformStats.verifiedChannels}</span>
          </div>
          <div className="text-white/50">
            Активных кампаний:{' '}
            <span className="text-white font-bold">{platformStats.activeCampaigns}</span>
          </div>
          <div className="text-white/50">
            Завершённых сделок:{' '}
            <span className="text-white font-bold">{platformStats.completedDeals}</span>
          </div>
          <div className="text-white/50 col-span-2">
            Общий оборот:{' '}
            <span className="text-green-400 font-bold text-lg">
              ${platformStats.totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Системные настройки</h2>
        {[
          {
            key: 'registrationOpen' as const,
            label: 'Регистрация открыта',
            storage: 'adverlink_reg_open',
          },
          {
            key: 'channelVerification' as const,
            label: 'Верификация каналов',
            storage: 'adverlink_verify_channels',
          },
          {
            key: 'campaignCreation' as const,
            label: 'Создание кампаний',
            storage: 'adverlink_create_campaigns',
          },
        ].map((item) => (
          <div
            key={item.key}
            className="flex justify-between items-center py-3 border-b border-white/5"
          >
            <span className="text-white text-sm">{item.label}</span>
            <button
              type="button"
              onClick={() =>
                onPlatformSettingsChange({
                  ...platformSettings,
                  [item.key]: !platformSettings[item.key],
                })
              }
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{
                background: platformSettings[item.key]
                  ? '#ef4444'
                  : 'rgba(255,255,255,0.15)',
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{
                  transform: platformSettings[item.key]
                    ? 'translateX(20px)'
                    : 'translateX(0)',
                }}
              />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onSavePlatformSettings}
          className="mt-4 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 rounded-xl px-6 py-2.5 text-sm font-medium"
        >
          Сохранить настройки
        </button>
      </div>
    </>
  )
}
