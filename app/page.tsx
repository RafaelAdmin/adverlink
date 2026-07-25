import Link from 'next/link'

const phoneChannels = [
  { name: 'Tech Armenia', subs: '125K', price: 'от 19 000 AMD', priceUsd: '≈ $50', color: '#9333ea' },
  { name: 'Business AM', subs: '87K', price: 'от 13 500 AMD', priceUsd: '≈ $35', color: '#0d9488' },
  { name: 'News Today', subs: '56K', price: 'от 9 600 AMD', priceUsd: '≈ $25', color: '#db2777' },
]

const features = [
  {
    icon: '🛡️',
    bg: 'rgba(147,51,234,0.2)',
    title: 'Проверенные каналы',
    sub: 'Каждый канал проходит модерацию',
  },
  {
    icon: '📊',
    bg: 'rgba(13,148,136,0.2)',
    title: 'Реальная статистика',
    sub: 'Актуальные данные и аналитика',
  },
  {
    icon: '🔒',
    bg: 'rgba(219,39,119,0.2)',
    title: 'Безопасные сделки',
    sub: 'Защита обеих сторон',
  },
  {
    icon: '🎧',
    bg: 'rgba(37,99,235,0.2)',
    title: 'Поддержка 24/7',
    sub: 'Мы всегда на связи',
  },
]

const sidebarItems = [
  { icon: '📋', label: 'Каталог каналов', active: true },
  { icon: '❤️', label: 'Избранное', active: false },
  { icon: '🤝', label: 'Мои сделки', active: false },
  { icon: '📨', label: 'Заявки', active: false },
  { icon: '💬', label: 'Сообщения', active: false },
  { icon: '💰', label: 'Баланс', active: false },
  { icon: '📊', label: 'Аналитика', active: false },
  { icon: '👤', label: 'Профиль', active: false },
]

const previewChannels = [
  {
    name: 'Разборки в Армении',
    username: 'razborki_am',
    category: 'Новости',
    subs: '142K',
    er: '12.4%',
    price: 'от 25 000 AMD за пост',
    gradient: 'linear-gradient(135deg, #9333ea, #6b21a8)',
  },
  {
    name: 'Технологии Армении',
    username: 'tech_arm',
    category: 'Технологии',
    subs: '98K',
    er: '10.1%',
    price: 'от 20 000 AMD за пост',
    gradient: 'linear-gradient(135deg, #0d9488, #0f766e)',
  },
  {
    name: 'Бизнес на миллион',
    username: 'business_arm',
    category: 'Бизнес',
    subs: '76K',
    er: '9.3%',
    price: 'от 15 000 AMD за пост',
    gradient: 'linear-gradient(135deg, #db2777, #9d174d)',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto bg-transparent">
        <div className="text-white text-xl font-bold">
          Adver<span style={{ color: 'var(--accent-primary, #9333ea)' }}>Link</span>
        </div>

        <div className="nav-links hidden md:flex items-center gap-8">
          <Link href="/marketplace" className="text-white/60 hover:text-white text-sm transition">
            Каталог каналов
          </Link>
          <Link href="/about" className="text-white/60 hover:text-white text-sm transition">
            О платформе
          </Link>
          <Link href="/faq" className="text-white/60 hover:text-white text-sm transition">
            FAQ
          </Link>
        </div>

        <Link
          href="/auth/login"
          className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-full text-sm font-medium transition"
        >
          Войти / Регистрация
        </Link>
      </nav>

      {/* Hero */}
      <section
        className="hero-section"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '48px',
          alignItems: 'center',
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '80px 32px',
        }}
      >
        <div>
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs px-3 py-1.5 rounded-full mb-6">
            ⭐ №1 маркетплейс рекламы в социальных сетях
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Реклама в Telegram
            <br />
            <span style={{ color: 'var(--accent-primary, #9333ea)' }}>без поиска по чатам</span>
            <br />
            <span style={{ color: 'var(--accent-primary, #9333ea)' }}>и личным сообщениям</span>
          </h1>

          <p className="text-white/60 text-base leading-relaxed mb-8 max-w-md border border-white/10 rounded-xl p-4 bg-white/[0.03]">
            Платформа, где рекламодатели находят подходящие площадки для продвижения, а создатели
            контента получают новых клиентов. Аналитика, рейтинги и удобный поиск — всё это в
            AdverLink!
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 text-white px-6 py-3 rounded-full font-medium text-sm transition hover:opacity-90"
              style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
            >
              Смотреть каналы →
            </Link>
            <Link
              href="/auth/login"
              className="flex items-center gap-2 bg-white/5 border border-white/20 hover:border-white/40 text-white px-6 py-3 rounded-full font-medium text-sm transition"
            >
              🎁 Стать Founder
            </Link>
          </div>

          <p className="text-white/30 text-xs mt-3">Первые 50 каналов получают PRO навсегда</p>
        </div>

        {/* iPhone mockup */}
        <div
          style={{ transform: 'rotate(-8deg)', transformOrigin: 'center' }}
          className="iphone-mockup relative hidden md:block"
        >
          <div
            style={{
              width: '260px',
              height: '520px',
              background: 'linear-gradient(145deg, #1a1a2e, #0f0f1a)',
              borderRadius: '40px',
              border: '2px solid rgba(255,255,255,0.15)',
              boxShadow:
                '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100px',
                height: '28px',
                background: '#0a0a1a',
                borderRadius: '20px',
                zIndex: 10,
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: '0',
                background: 'linear-gradient(135deg, #0f0c29 0%, #1a1560 50%, #24243e 100%)',
                padding: '50px 12px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                  Adver<span style={{ color: '#9333ea' }}>Link</span>
                </span>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#9333ea',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  A
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  marginBottom: '12px',
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                🔍 Поиск каналов...
              </div>

              {phoneChannels.map((ch, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '8px',
                    marginBottom: '6px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: ch.color,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    {ch.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: '8px', fontWeight: '600' }}>{ch.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '7px' }}>
                      {ch.subs} подписчиков
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#9333ea', fontSize: '8px', fontWeight: 'bold' }}>{ch.price}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '6px' }}>{ch.priceUsd}</div>
                  </div>
                </div>
              ))}

              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '12px',
                  right: '12px',
                  background: '#9333ea',
                  borderRadius: '12px',
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: '9px',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                Запросить рекламу
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80px',
                height: '4px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
              }}
            />
          </div>

          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '-80px',
              background: 'rgba(15,12,41,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              padding: '10px 14px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(147,51,234,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
              }}
            >
              🛡️
            </div>
            <div>
              <div style={{ color: 'white', fontSize: '10px', fontWeight: '600' }}>Проверенные</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>каналы</div>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '60px',
              right: '-90px',
              background: 'rgba(15,12,41,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              padding: '10px 14px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(13,148,136,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
              }}
            >
              📊
            </div>
            <div>
              <div style={{ color: 'white', fontSize: '10px', fontWeight: '600' }}>Реальная</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>статистика</div>
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '80px',
              left: '-60px',
              background: 'rgba(15,12,41,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              padding: '10px 14px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(219,39,119,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
              }}
            >
              🔒
            </div>
            <div>
              <div style={{ color: 'white', fontSize: '10px', fontWeight: '600' }}>Безопасные</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>сделки</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features bar */}
      <section className="bg-white/[0.03] border-t border-b border-white/10 py-6 mt-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-7xl mx-auto px-8">
          {features.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: f.bg }}
              >
                {f.icon}
              </div>
              <div>
                <div className="text-white text-sm font-medium">{f.title}</div>
                <div className="text-white/40 text-xs">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Marketplace preview */}
      <section className="max-w-7xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-10">
          Тысячи каналов. Удобный поиск. Честная статистика.
        </h2>

        <div
          className="marketplace-preview-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px',
          }}
        >
          <div className="marketplace-preview-sidebar bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-white text-sm font-bold mb-4">
              Adver<span style={{ color: 'var(--accent-primary, #9333ea)' }}>Link</span>
            </div>
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-1 ${
                  item.active ? 'text-white' : 'text-white/50'
                }`}
                style={
                  item.active ? { backgroundColor: 'var(--accent-primary, #9333ea)' } : undefined
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="marketplace-preview-channels">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-2 mb-4 text-white/40 text-sm">
              🔍 Поиск по названию или тематике...
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {['Тематика ▾', 'Подписчики ▾', 'Цена ▾', 'ER ▾', '⚙ Фильтры'].map((pill) => (
                <span
                  key={pill}
                  className="bg-white/5 border border-white/10 text-white/60 text-xs px-3 py-1.5 rounded-full"
                >
                  {pill}
                </span>
              ))}
            </div>

            {previewChannels.map((ch) => (
              <div
                key={ch.username}
                className="flex flex-wrap items-center gap-4 py-4 border-b border-white/5"
              >
                <div
                  className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: ch.gradient }}
                >
                  {ch.name[0]}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <div className="text-white font-medium text-sm">{ch.name}</div>
                  <div className="text-white/40 text-xs">@{ch.username}</div>
                </div>
                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full">
                  {ch.category}
                </span>
                <div className="text-white/60 text-xs">{ch.subs} подписчиков</div>
                <div className="text-white/60 text-xs">{ch.er} ER</div>
                <div className="text-white/50 text-xs">{ch.price}</div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    className="text-white text-xs px-4 py-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
                  >
                    Подробнее
                  </button>
                  <span className="text-white/30 text-lg">♡</span>
                </div>
              </div>
            ))}

            <div className="text-center mt-8">
              <Link
                href="/marketplace"
                className="text-sm font-medium hover:opacity-80 transition"
                style={{ color: 'var(--accent-primary, #9333ea)' }}
              >
                Смотреть все каналы →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="border border-white/10 rounded-3xl max-w-7xl mx-auto mx-8 my-16 p-10 md:p-16 text-center"
        style={{
          background: 'linear-gradient(to right, rgba(88,28,135,0.3), rgba(30,58,138,0.3))',
        }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Готов начать?</h2>
        <p className="text-white/50 text-lg mb-8">
          Присоединяйся к сотням создателей и рекламодателей Армении
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/auth/login"
            className="text-white px-8 py-3 rounded-full font-medium text-sm transition hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
          >
            Добавить канал
          </Link>
          <Link
            href="/marketplace"
            className="border border-white/30 hover:border-white/50 text-white px-8 py-3 rounded-full font-medium text-sm transition"
          >
            Найти каналы
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="text-white font-bold mb-1">
              Adver<span style={{ color: 'var(--accent-primary, #9333ea)' }}>Link</span>
            </div>
            <div className="text-white/40 text-sm">© 2026 AdverLink. Все права защищены.</div>
          </div>

          <div className="flex flex-wrap gap-6 justify-center">
            {['О платформе', 'FAQ', 'Поддержка', 'Pricing'].map((label) => (
              <Link
                key={label}
                href={
                  label === 'Pricing'
                    ? '/pricing'
                    : label === 'FAQ'
                      ? '/faq'
                      : label === 'Поддержка'
                        ? 'mailto:support@adverlink.am'
                        : '/about'
                }
                className="text-white/50 hover:text-white text-sm transition"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="text-white/30 text-sm">Армения 🇦🇲</div>
        </div>
      </footer>
    </div>
  )
}
