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

export default function RefundsPage() {
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
          Политика возвратов (Beta)
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 8px' }}>
          Дата последнего обновления: 26 августа 2026 г.
        </p>

        <h2 style={h2Style}>1. Платежи через AdverLink</h2>
        <p style={pStyle}>
          На этапе Beta AdverLink не принимает онлайн-оплату подписок и не удерживает средства по
          рекламным сделкам. Возвраты через платформу в настоящее время не применяются, так как
          финансовые расчёты между сторонами производятся самостоятельно.
        </p>

        <h2 style={h2Style}>2. Подписки Pro и Business</h2>
        <p style={pStyle}>
          Покупка тарифов Pro (€18/мес) и Business (€80/мес) пока недоступна. После запуска
          официальной оплаты политика возвратов будет опубликована в обновлённой версии документа.
        </p>

        <h2 style={h2Style}>3. Споры по сделкам</h2>
        <p style={pStyle}>
          При разногласиях по рекламной сделке стороны могут использовать инструмент «Спор» в личном
          кабинете для фиксации претензии. Решение по возмещению принимается сторонами напрямую;
          AdverLink может помочь в коммуникации, но не выполняет автоматических возвратов на этапе
          Beta.
        </p>

        <h2 style={h2Style}>4. Контакты</h2>
        <p style={pStyle}>
          Вопросы по возвратам и спорам:{' '}
          <a href="mailto:support@adverlink.am" style={{ color: 'rgba(255,255,255,0.8)' }}>
            support@adverlink.am
          </a>
          .
        </p>
      </article>
    </div>
  )
}
