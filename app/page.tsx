'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import HeroChannelCarousel from './HeroChannelCarousel'

function LandingScreenshot({
  src,
  alt,
  minHeight = '320px',
  objectPosition = 'top center',
}: {
  src: string
  alt: string
  minHeight?: string
  objectPosition?: string
}) {
  return (
    <div
      className="landing-screenshot"
      style={{
        minHeight,
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        background: 'rgba(255,255,255,0.04)',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          minHeight,
          objectFit: 'cover',
          objectPosition,
          display: 'block',
        }}
      />
    </div>
  )
}

function CheckItem({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <li className={`landing-check-item ${muted ? 'landing-check-item--muted' : ''}`}>
      <span className="landing-check-icon">{muted ? '✗' : '✓'}</span>
      <span>{children}</span>
    </li>
  )
}

function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`landing-navbar ${scrolled ? 'landing-navbar--scrolled' : ''}`}>
      <div className="landing-container landing-navbar-inner">
        <Link href="/" className="landing-logo">
          Adver<span>Link</span>
        </Link>

        <div className="landing-nav-links">
          <Link href="/marketplace">Маркетплейс</Link>
          <a href="#features">Возможности</a>
          <a href="#pricing">Тарифы</a>
        </div>

        <div className="landing-nav-actions">
          <Link href="/auth/login" className="landing-btn landing-btn--outline landing-btn--sm">
            Войти
          </Link>
          <Link href="/auth/login" className="landing-btn landing-btn--accent landing-btn--sm">
            Начать бесплатно
          </Link>
        </div>
      </div>
    </nav>
  )
}

const advertiserSteps = [
  { num: '1', icon: '🔍', title: 'Найди канал', desc: 'Фильтруй по тематике, подписчикам, цене и ER. Только верифицированные каналы.' },
  { num: '2', icon: '📨', title: 'Отправь запрос', desc: 'Оплата резервируется на платформе. Создатель видит запрос и принимает решение.' },
  { num: '3', icon: '✅', title: 'Получи результат', desc: 'Создатель публикует рекламу, вы проверяете — деньги переводятся после подтверждения.' },
]

const creatorSteps = [
  { num: '1', icon: '📱', title: 'Добавь канал', desc: 'Подключи Telegram или YouTube. Пройди верификацию и укажи цену за рекламу.' },
  { num: '2', icon: '📬', title: 'Получай заказы', desc: 'Рекламодатели находят ваш канал в маркетплейсе и отправляют запросы напрямую.' },
  { num: '3', icon: '💰', title: 'Получай оплату', desc: 'Выполни заказ, отправь proof — средства поступают после подтверждения рекламодателем.' },
]

function HowItWorksSection() {
  const [tab, setTab] = useState<'advertiser' | 'creator'>('advertiser')
  const steps = tab === 'advertiser' ? advertiserSteps : creatorSteps

  return (
    <section id="how-it-works" className="landing-section">
      <div className="landing-container">
        <h2 className="landing-section-title">Как это работает</h2>
        <div className="landing-tabs">
          <button
            type="button"
            className={`landing-tab ${tab === 'advertiser' ? 'landing-tab--active' : ''}`}
            onClick={() => setTab('advertiser')}
          >
            Я рекламодатель
          </button>
          <button
            type="button"
            className={`landing-tab ${tab === 'creator' ? 'landing-tab--active' : ''}`}
            onClick={() => setTab('creator')}
          >
            Я создатель
          </button>
        </div>
        <div className="landing-steps-grid">
          {steps.map((step) => (
            <div key={step.num} className="landing-glass-card landing-step-card">
              <div className="landing-step-num">{step.num}</div>
              <div className="landing-step-icon">{step.icon}</div>
              <h3 className="landing-step-title">{step.title}</h3>
              <p className="landing-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const painPoints = [
  { icon: '⏳', title: 'Часами ищешь каналы', desc: 'Переписки в Telegram-чатах, сарафанное радио, таблицы в Excel — и всё равно непонятно, кому писать.' },
  { icon: '⚠️', title: 'Нет никаких гарантий', desc: 'Предоплата в личку, создатель пропадает, реклама не выходит — вернуть деньги почти невозможно.' },
  { icon: '❓', title: 'Не знаешь что покупаешь', desc: 'Накрученные подписчики, фейковые охваты, устаревшая статистика — рискуешь бюджетом вслепую.' },
]

const solutionPoints = ['Каталог верифицированных каналов', 'Безопасные сделки с защитой', 'Прозрачная аналитика']

const features = [
  { title: 'Управляй каналами в одном месте', desc: 'Добавляй Telegram и YouTube, проходи верификацию, получай запросы и веди все сделки в едином дашборде.', pro: false, reverse: false, image: '/landing/screenshot-2.png', imageAlt: 'Мои каналы в AdverLink' },
  { title: 'Аналитика Pro — отчёты за любой период', desc: 'Скачивай Excel и PDF отчёты с историей сделок, доходами и охватами за любой выбранный период.', pro: true, reverse: true, image: '/landing/screenshot-3.png', imageAlt: 'Аналитика канала' },
  { title: 'Кампании с несколькими каналами', desc: 'Запускай одну кампанию сразу на несколько каналов — создатели откликаются сами, вы выбираете лучших.', pro: false, reverse: false, image: '/landing/screenshot-6.png', imageAlt: 'Мои кампании' },
  { title: 'Настрой платформу под себя', desc: 'Переключай роли рекламодатель/создатель, настраивай профиль, получай Pro-значок и приоритет в поиске.', pro: false, reverse: true, image: '/landing/screenshot-5.png', imageAlt: 'Настройки и кастомизация' },
]

// TODO: Replace with real testimonials
const testimonials = [
  { name: 'Арам П.', role: 'Владелец канала', text: '«Раньше тратил часы на поиск рекламодателей в чатах. Теперь заказы приходят сами через AdverLink — удобно и прозрачно.»' },
  { name: 'Маринэ С.', role: 'Маркетолог, Ереван', text: '«Наконец-то можно покупать рекламу с гарантией. Вижу статистику канала, оплата через платформу — спокойно за бюджет.»' },
  { name: 'Гагик А.', role: 'Владелец бизнеса', text: '«Запустил кампанию на 5 каналов за один день. Все сделки в одном месте, отчёты понятные. Рекомендую.»' },
]

export default function Home() {
  return (
    <div className="landing-page">
      <div className="landing-orb landing-orb--1" aria-hidden />
      <div className="landing-orb landing-orb--2" aria-hidden />
      <div className="landing-orb landing-orb--3" aria-hidden />
      <div className="landing-orb landing-orb--4" aria-hidden />

      <LandingNavbar />

      <section id="hero" className="landing-section landing-hero">
        <div className="landing-container landing-hero-grid">
          <div>
            <div className="landing-badge">🇦🇲 №1 маркетплейс для рекламы в социальных сетях</div>
            <h1 className="landing-hero-title">Реклама в социальных сетях — без переписок, без рисков</h1>
            <p className="landing-hero-subtitle">
              AdverLink соединяет владельцев каналов с рекламодателями. Верифицированные каналы,
              безопасные сделки, реальная аналитика.
            </p>
            <div className="landing-hero-buttons">
              <Link href="/auth/login" className="landing-btn landing-btn--accent">Найти каналы →</Link>
              <Link href="/auth/login" className="landing-btn landing-btn--outline">Добавить канал</Link>
            </div>
            <p className="landing-hero-note">🏆 Первые 50 каналов получают Pro навсегда</p>
            <div className="landing-stats">
              <div className="landing-stat"><strong>500+</strong><span>каналов</span></div>
              <div className="landing-stat-divider" />
              <div className="landing-stat"><strong>1,200+</strong><span>сделок</span></div>
              <div className="landing-stat-divider" />
              <div className="landing-stat"><strong>98%</strong><span>успешных</span></div>
            </div>
          </div>
          <HeroChannelCarousel />
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <h2 className="landing-section-title">Как сейчас выглядит реклама в социальных сетях</h2>
          <div className="landing-cards-grid">
            {painPoints.map((card) => (
              <div key={card.title} className="landing-glass-card landing-pain-card">
                <div className="landing-pain-icon">{card.icon}</div>
                <h3 className="landing-card-title">{card.title}</h3>
                <p className="landing-card-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <h2 className="landing-section-title">AdverLink решает всё это</h2>
          <div className="landing-split">
            <LandingScreenshot
              src="/landing/screenshot-4.png"
              alt="Страница канала в AdverLink"
            />
            <div className="landing-solution-points">
              {solutionPoints.map((point) => (
                <div key={point} className="landing-solution-point">
                  <span className="landing-check-green">✓</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HowItWorksSection />

      <section id="features" className="landing-section">
        <div className="landing-container landing-features-stack">
          {features.map((f) => (
            <div key={f.title} className={`landing-feature-row ${f.reverse ? 'landing-feature-row--reverse' : ''}`}>
              <div className="landing-feature-text">
                {f.pro && <span className="landing-pro-badge">PRO</span>}
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-card-desc">{f.desc}</p>
              </div>
              <LandingScreenshot
                src={f.image}
                alt={f.imageAlt}
                minHeight="280px"
              />
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="landing-section">
        <div className="landing-container">
          <h2 className="landing-section-title">Простые и честные тарифы</h2>
          <div className="landing-pricing-grid">
            <div className="landing-glass-card landing-pricing-card">
              <h3 className="landing-pricing-name">Free</h3>
              <div className="landing-pricing-price">€0<span>/месяц</span></div>
              <ul className="landing-pricing-list">
                <CheckItem>До 3 каналов</CheckItem>
                <CheckItem>До 3 кампаний в месяц</CheckItem>
                <CheckItem>Сделки без ограничений</CheckItem>
                <CheckItem>Отзывы и рейтинги</CheckItem>
                <CheckItem muted>Приоритет в поиске</CheckItem>
                <CheckItem muted>Аналитика и отчёты</CheckItem>
                <CheckItem muted>0% комиссии (10% берётся с каждой сделки)</CheckItem>
              </ul>
              <Link href="/auth/login" className="landing-btn landing-btn--outline landing-btn--full">Начать бесплатно</Link>
            </div>
            <div className="landing-glass-card landing-pricing-card landing-pricing-card--pro">
              <span className="landing-pricing-recommend">Рекомендуем</span>
              <h3 className="landing-pricing-name">Pro</h3>
              <div className="landing-pricing-price">€18<span>/месяц</span></div>
              <p className="landing-pricing-year">или €144/год (скидка 33%)</p>
              <ul className="landing-pricing-list">
                <CheckItem>Неограниченные каналы</CheckItem>
                <CheckItem>Неограниченные кампании</CheckItem>
                <CheckItem>Приоритет в маркетплейсе</CheckItem>
                <CheckItem>Pro значок на профиле</CheckItem>
                <CheckItem>Аналитика за любой период</CheckItem>
                <CheckItem>Excel / PDF отчёты</CheckItem>
                <CheckItem>0% комиссия платформы</CheckItem>
              </ul>
              <Link href="/auth/login" className="landing-btn landing-btn--accent landing-btn--full">Попробовать Pro</Link>
            </div>
            <div
              className="landing-pricing-card landing-pricing-card--business"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '28px',
                position: 'relative',
                opacity: 0.7,
                filter: 'grayscale(30%)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  letterSpacing: '0.06em',
                }}
              >
                СКОРО
              </span>
              <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                Бизнес
              </h3>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
                €80 / месяц
              </div>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', marginBottom: '20px' }}>
                Для агентств и крупных рекламодателей
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '0 0 20px' }} />
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {[
                  'Всё из плана Pro',
                  'API ключи для интеграций',
                  'Автопостинг через Telegram бота',
                  'Мультиаккаунт (до 5 пользователей)',
                  'Приоритетная поддержка 24/7',
                  'Персональный менеджер',
                  'Кастомная аналитика',
                  'White label (ваш бренд)',
                ].map((feature) => (
                  <li
                    key={feature}
                    style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                style={{
                  width: '100%',
                  padding: '13px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'not-allowed',
                  marginTop: '24px',
                }}
              >
                Скоро доступно
              </button>
              <p style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                Хочешь попасть в список ожидания?{' '}
                <a href="mailto:support@adverlink.am" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'underline' }}>
                  support@adverlink.am
                </a>
              </p>
            </div>
          </div>
          <p className="landing-pricing-note">Free пользователи платят 10% комиссию с каждой сделки</p>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          {/* TODO: Replace with real testimonials */}
          <h2 className="landing-section-title">Что говорят пользователи</h2>
          <div className="landing-cards-grid">
            {testimonials.map((t) => (
              <div key={t.name} className="landing-glass-card landing-review-card">
                <div className="landing-stars">★★★★★</div>
                <p className="landing-review-text">{t.text}</p>
                <div className="landing-review-author">
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-final-cta">
            <h2 className="landing-final-title">Готов начать?</h2>
            <p className="landing-final-subtitle">Присоединяйся к сотням создателей и рекламодателей Армении</p>
            <div className="landing-hero-buttons landing-hero-buttons--center">
              <Link href="/auth/login" className="landing-btn landing-btn--accent">Добавить канал бесплатно →</Link>
              <Link href="/auth/login" className="landing-btn landing-btn--outline-light">Найти каналы</Link>
            </div>
            <p className="landing-hero-note">🏆 Первые 50 каналов получают Pro навсегда</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div>
              <div className="landing-logo">Adver<span>Link</span></div>
              <p className="landing-footer-tagline">Маркетплейс Telegram-рекламы в Армении</p>
              <div className="landing-social">
                <a href="https://t.me/adverlink" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                  <i className="ti ti-brand-telegram" />
                </a>
                <a href="https://instagram.com/adverlink" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <i className="ti ti-brand-instagram" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="landing-footer-heading">Платформа</h4>
              <ul className="landing-footer-links">
                <li><Link href="/marketplace">Маркетплейс</Link></li>
                <li><a href="#how-it-works">Как это работает</a></li>
                <li><a href="#pricing">Тарифы</a></li>
                <li><Link href="/auth/login">Для создателей</Link></li>
                <li><Link href="/auth/login">Для рекламодателей</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="landing-footer-heading">Компания</h4>
              <ul className="landing-footer-links">
                <li><Link href="/about">О нас</Link></li>
                <li><span className="landing-footer-soon">Блог (скоро)</span></li>
                <li><Link href="/about">Партнёрам</Link></li>
                <li><a href="mailto:support@adverlink.am">Контакты</a></li>
              </ul>
            </div>
            <div>
              <h4 className="landing-footer-heading">Юридическое</h4>
              <ul className="landing-footer-links">
                <li><Link href="/legal/terms">Пользовательское соглашение</Link></li>
                <li><Link href="/legal/privacy">Политика конфиденциальности</Link></li>
                <li><Link href="/legal/offer">Публичная оферта</Link></li>
                <li><Link href="/legal/refunds">Политика возвратов</Link></li>
              </ul>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>© 2026 AdverLink. Все права защищены. 🇦🇲</span>
            <a href="mailto:support@adverlink.am">support@adverlink.am</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
