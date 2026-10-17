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

const pStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)',
  fontSize: '15px',
  lineHeight: 1.7,
  margin: 0,
}

export default function DataDeletionPage() {
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
        <h1
          style={{
            color: '#fff',
            fontSize: '1.75rem',
            fontWeight: 700,
            margin: '0 0 8px',
            lineHeight: 1.3,
          }}
        >
          Удаление данных
        </h1>
        <p style={{ ...pStyle, marginBottom: '16px' }}>
          Чтобы удалить аккаунт AdverLink и связанные данные подтверждения Instagram / TikTok,
          напишите в поддержку через контакты на сайте и укажите email, с которого вы входите.
          Мы удалим профиль, привязки внешних аккаунтов и служебные сессии OAuth. Пароли соцсетей
          AdverLink не хранит.
        </p>
        <p style={pStyle}>
          Этот адрес также используется как Data Deletion URL для приложений Meta.
        </p>
      </article>
    </div>
  )
}
