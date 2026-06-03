import Link from 'next/link'

const creatorPlans = [
  {
    name: 'Free',
    price: '$0',
    period: 'навсегда',
    description: 'Для начинающих создателей',
    color: 'border-white/10',
    badge: null,
    features: [
      'Профиль создателя',
      'Добавить каналы',
      'Верификация канала',
      'Получать запросы на рекламу',
      'Видимость в маркетплейсе',
      'Базовая аналитика',
      'Отзывы и рейтинг',
    ],
    limitations: [
      'Стандартный рейтинг в поиске',
      'Без расширенной аналитики',
      'Без приоритетного размещения',
    ],
    cta: 'Начать бесплатно',
    ctaHref: '/auth/login',
    highlighted: false,
  },
  {
    name: 'Creator Pro',
    price: '$19',
    period: 'в месяц',
    description: 'Для серьёзных создателей',
    color: 'border-purple-500',
    badge: 'Популярный',
    features: [
      'Всё из Free плана',
      'Приоритет в результатах поиска',
      'Расширенная аналитика канала',
      'Детальные метрики производительности',
      'Премиум оформление профиля',
      'Кастомизация профиля',
      'Ранний доступ к новым функциям',
      'Значок Creator Pro на профиле',
    ],
    limitations: [],
    cta: 'Скоро',
    ctaHref: '#',
    highlighted: true,
  },
]

const advertiserPlans = [
  {
    name: 'Free',
    price: '$0',
    period: 'навсегда',
    description: 'Для начинающих рекламодателей',
    color: 'border-white/10',
    badge: null,
    features: [
      'Создать аккаунт',
      'Поиск каналов',
      'Базовые фильтры',
      'Создавать кампании',
      'Отправлять запросы',
    ],
    limitations: [
      'Ограниченные фильтры',
      'Стандартная видимость кампаний',
      'Без рекомендаций',
    ],
    cta: 'Начать бесплатно',
    ctaHref: '/auth/login',
    highlighted: false,
  },
  {
    name: 'Advertiser Pro',
    price: '$29',
    period: 'в месяц',
    description: 'Для активных рекламодателей',
    color: 'border-purple-500',
    badge: 'Популярный',
    features: [
      'Всё из Free плана',
      'Расширенные фильтры поиска',
      'Приоритетное размещение кампаний',
      'Дашборд рекомендованных каналов',
      'Сохранённые поиски',
      'Списки избранных каналов',
      'Аналитика кампаний',
      'Приоритетная поддержка',
      'Ранний доступ к новым инструментам',
    ],
    limitations: [],
    cta: 'Скоро',
    ctaHref: '#',
    highlighted: true,
  },
]

const levels = [
  { name: 'Silver', deals: 10, icon: '🥈', color: 'from-gray-400 to-gray-500' },
  { name: 'Gold', deals: 50, icon: '🥇', color: 'from-yellow-400 to-yellow-500' },
  { name: 'Diamond', deals: 100, icon: '💎', color: 'from-blue-400 to-purple-500' },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e]">

      {/* Навигация */}
      <nav className="flex items-center justify-between px-8 py-6">
        <Link href="/" className="text-white text-2xl font-bold tracking-tight">
          Adver<span className="text-purple-400">Link</span>
        </Link>
        <div className="flex gap-4">
          <Link href="/marketplace" className="text-white/70 hover:text-white transition px-4 py-2 text-sm">
            Маркетплейс
          </Link>
          <Link href="/auth/login" className="bg-purple-600 hover:bg-purple-500 transition text-white px-5 py-2 rounded-full text-sm font-medium">
            Войти
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">

        {/* Заголовок */}
        <div className="text-center mb-16">
          <div className="inline-block bg-purple-500/20 text-purple-300 text-sm px-4 py-1.5 rounded-full mb-6 border border-purple-500/30">
            Простые и честные цены
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Выбери свой план
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Начни бесплатно. Переходи на Pro когда будешь готов расти.
          </p>
        </div>

        {/* Founder Program */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-8 mb-16 text-center">
          <div className="text-3xl mb-3">🏆</div>
          <h2 className="text-white text-2xl font-bold mb-2">Founder Program</h2>
          <p className="text-white/60 mb-4 max-w-lg mx-auto">
            Только для ранних пользователей. Получи Founder Badge, бесплатный Pro доступ и приоритетное размещение на этапе запуска. Навсегда.
          </p>
          <div className="flex justify-center gap-4 flex-wrap mb-6">
            {['Founder Badge', 'Бесплатный Pro', 'Приоритет при запуске', 'Вечный статус'].map((f) => (
              <span key={f} className="bg-purple-500/20 text-purple-300 text-sm px-3 py-1 rounded-full border border-purple-500/30">
                ✓ {f}
              </span>
            ))}
          </div>
          <Link href="/auth/login" className="bg-purple-600 hover:bg-purple-500 transition text-white px-8 py-3 rounded-full font-medium">
            Стать Founder — бесплатно сейчас
          </Link>
        </div>

        {/* Планы для создателей */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-2">Для создателей</h2>
          <p className="text-white/50 mb-8">Владельцы Telegram каналов</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {creatorPlans.map((plan) => (
              <div key={plan.name} className={`bg-white/5 border ${plan.color} rounded-2xl p-8 relative ${plan.highlighted ? 'border-2' : ''}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-8">
                    <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-white text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-white/50 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-white/50 text-sm">{plan.period}</span>
                  </div>
                </div>
                <div className="mb-6">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-white/70 text-sm py-1.5">
                      <span className="text-green-400">✓</span>
                      {f}
                    </div>
                  ))}
                  {plan.limitations.map((l) => (
                    <div key={l} className="flex items-center gap-2 text-white/30 text-sm py-1.5">
                      <span>✗</span>
                      {l}
                    </div>
                  ))}
                </div>
                <Link
                  href={plan.ctaHref}
                  className={`block text-center py-3 rounded-xl font-medium transition text-sm ${
                    plan.highlighted
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'border border-white/20 hover:border-white/40 text-white'
                  } ${plan.cta === 'Скоро' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Планы для рекламодателей */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-2">Для рекламодателей</h2>
          <p className="text-white/50 mb-8">Бренды и бизнесы которые покупают рекламу</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {advertiserPlans.map((plan) => (
              <div key={plan.name} className={`bg-white/5 border ${plan.color} rounded-2xl p-8 relative ${plan.highlighted ? 'border-2' : ''}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-8">
                    <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-white text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-white/50 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-white/50 text-sm">{plan.period}</span>
                  </div>
                </div>
                <div className="mb-6">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-white/70 text-sm py-1.5">
                      <span className="text-green-400">✓</span>
                      {f}
                    </div>
                  ))}
                  {plan.limitations.map((l) => (
                    <div key={l} className="flex items-center gap-2 text-white/30 text-sm py-1.5">
                      <span>✗</span>
                      {l}
                    </div>
                  ))}
                </div>
                <Link
                  href={plan.ctaHref}
                  className={`block text-center py-3 rounded-xl font-medium transition text-sm ${
                    plan.highlighted
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'border border-white/20 hover:border-white/40 text-white'
                  } ${plan.cta === 'Скоро' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Система уровней */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-2">Система уровней</h2>
          <p className="text-white/50 mb-8">Зарабатывай уровни через завершённые сделки. Уровни нельзя купить.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {levels.map((level) => (
              <div key={level.name} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="text-5xl mb-4">{level.icon}</div>
                <div className="text-white font-bold text-xl mb-2">{level.name}</div>
                <div className="text-white/50 text-sm">{level.deals} завершённых сделок</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-white text-2xl font-bold mb-8 text-center">Частые вопросы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: 'Можно ли купить верификацию?',
                a: 'Нет. Верификация это подтверждение что канал реальный. Она бесплатна и не продаётся.',
              },
              {
                q: 'Когда появятся платные планы?',
                a: 'Pro планы появятся после запуска платформы. Сейчас все функции доступны бесплатно.',
              },
              {
                q: 'Что такое Founder Badge?',
                a: 'Эксклюзивный значок для ранних пользователей. Никогда не будет продаваться. Зарегистрируйся сейчас чтобы получить его.',
              },
              {
                q: 'Уровни можно купить?',
                a: 'Нет. Уровни Silver, Gold и Diamond зарабатываются только через реальные завершённые сделки.',
              },
            ].map((item) => (
              <div key={item.q} className="border-b border-white/10 pb-6">
                <div className="text-white font-medium mb-2">{item.q}</div>
                <div className="text-white/50 text-sm">{item.a}</div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}