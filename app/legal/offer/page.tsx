import Link from 'next/link'

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '24px',
  padding: '40px',
  width: '100%',
  maxWidth: '760px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
  position: 'relative',
  zIndex: 1,
}

const h2Style: React.CSSProperties = {
  color: '#fff',
  fontSize: '1.125rem',
  fontWeight: 600,
  marginTop: '28px',
  marginBottom: '12px',
}

const pStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)',
  fontSize: '15px',
  lineHeight: 1.7,
  margin: 0,
}

export default function OfferPage() {
  return (
    <div
      className="landing-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 24px 48px',
        position: 'relative',
      }}
    >
      <div className="landing-orb landing-orb--1" aria-hidden />
      <div className="landing-orb landing-orb--2" aria-hidden />
      <div className="landing-orb landing-orb--3" aria-hidden />
      <div className="landing-orb landing-orb--4" aria-hidden />

      <Link
        href="/"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '14px',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 2,
        }}
      >
        ← Главная
      </Link>

      <article style={cardStyle}>
        <h1 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.3 }}>
          Публичная оферта (Beta)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 8px' }}>
          Дата последнего обновления: 26 августа 2026 г.
        </p>

        <h2 style={h2Style}>1. Статус документа</h2>
        <p style={pStyle}>
          Настоящий документ описывает условия использования платформы AdverLink на этапе Beta.
          Полная коммерческая оферта будет опубликована до запуска онлайн-оплаты и функции Safe Deal.
        </p>

        <h2 style={h2Style}>2. Предмет</h2>
        <p style={pStyle}>
          AdverLink предоставляет доступ к маркетплейсу для поиска рекламных площадок и организации
          взаимодействия между рекламодателями и владельцами каналов. Платформа не является стороной
          сделок и не выступает платёжным агентом на этапе Beta.
        </p>

        <h2 style={h2Style}>3. Тарифы</h2>
        <p style={pStyle}>
          Актуальные тарифы: Free — €0/мес, Pro — €18/мес, Business — €80/мес. Оплата подписок в
          текущей версии недоступна; тарифы указаны для ознакомления. Бюджеты рекламных сделок
          указываются в AMD и согласуются сторонами напрямую.
        </p>

        <h2 style={h2Style}>4. Отказ от гарантий</h2>
        <p style={pStyle}>
          Сервис предоставляется «как есть». AdverLink не гарантирует результат сделок между
          пользователями и не несёт ответственности за расчёты, произведённые вне платформы.
        </p>

        <h2 style={h2Style}>5. Связанные документы</h2>
        <p style={pStyle}>
          Также действуют{' '}
          <Link href="/legal/terms" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Условия использования
          </Link>{' '}
          и{' '}
          <Link href="/legal/privacy" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Политика конфиденциальности
          </Link>
          .
        </p>
      </article>
    </div>
  )
}
