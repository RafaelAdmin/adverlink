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

export default function PrivacyPage() {
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
          Политика конфиденциальности AdverLink
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '14px',
            margin: '0 0 8px',
          }}
        >
          Дата последнего обновления: 25 августа 2026 г.
        </p>

        <h2 style={h2Style}>1. Какие данные мы собираем</h2>
        <p style={pStyle}>
          При регистрации и использовании платформы мы собираем: email, имя, аватар, имя пользователя
          Telegram, информацию о ваших каналах (название, статистика, ссылки), сообщения в рамках
          сделок на платформе, а также техническую информацию об использовании сервиса.
        </p>

        <h2 style={h2Style}>2. Как мы используем данные</h2>
        <p style={pStyle}>
          Собранные данные используются для работы вашего аккаунта, связи между рекламодателями и
          владельцами каналов, отправки важных уведомлений (включая подтверждение email при
          регистрации) и улучшения качества сервиса.
        </p>

        <h2 style={h2Style}>3. Передача данных третьим лицам</h2>
        <p style={pStyle}>
          AdverLink не продаёт и не передаёт ваши персональные данные третьим лицам в маркетинговых
          целях. Для работы сервиса мы используем внешних технических поставщиков — Supabase
          (хранение данных и авторизация) и Resend (отправка email-уведомлений), которые обрабатывают
          данные исключительно в рамках предоставления своих услуг.
        </p>

        <h2 style={h2Style}>4. Хранение и защита данных</h2>
        <p style={pStyle}>
          Данные хранятся на серверах Supabase с применением технических мер защиты, включая политики
          доступа на уровне базы данных. Рекомендуем использовать надёжный пароль и не передавать
          данные для входа третьим лицам.
        </p>

        <h2 style={h2Style}>5. Ваши права</h2>
        <p style={pStyle}>
          Вы можете запросить удаление своего аккаунта и связанных с ним данных, обратившись в
          поддержку через контакты на сайте.
        </p>

        <h2 style={h2Style}>6. Файлы cookie</h2>
        <p style={pStyle}>
          Платформа использует технические файлы cookie, необходимые для авторизации и сохранения
          сессии входа.
        </p>

        <h2 style={h2Style}>7. Изменения политики</h2>
        <p style={pStyle}>
          Мы можем время от времени обновлять данную политику. Актуальная версия всегда доступна по
          этой ссылке.
        </p>

        <h2 style={h2Style}>8. Контакты</h2>
        <p style={pStyle}>
          По вопросам обработки персональных данных вы можете связаться с нами через контакты,
          указанные на сайте.
        </p>
      </article>
    </div>
  )
}
