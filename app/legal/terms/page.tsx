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

export default function TermsPage() {
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
          Условия использования AdverLink
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

        <h2 style={h2Style}>1. Общие положения</h2>
        <p style={pStyle}>
          AdverLink — это платформа (маркетплейс), которая соединяет рекламодателей и владельцев
          Telegram/YouTube-каналов для размещения рекламы. AdverLink не является стороной сделок,
          заключаемых между пользователями платформы, и выступает только посредником, предоставляющим
          инструменты для поиска, общения и организации сотрудничества.
        </p>

        <h2 style={h2Style}>2. Регистрация и аккаунт</h2>
        <p style={pStyle}>
          Регистрируясь на платформе, вы подтверждаете, что предоставленные данные достоверны, и
          берёте на себя ответственность за сохранность доступа к своему аккаунту. Один пользователь
          может иметь только один аккаунт. Использование платформы разрешено только лицам, обладающим
          необходимой правоспособностью по законодательству своей страны.
        </p>

        <h2 style={h2Style}>3. Правила поведения</h2>
        <p style={pStyle}>
          Запрещается: указывать недостоверную статистику каналов, использовать платформу для
          мошенничества, рассылать спам, размещать рекламу незаконных товаров и услуг, оскорблять
          других пользователей. AdverLink оставляет за собой право заблокировать аккаунт при нарушении
          этих правил без предварительного уведомления.
        </p>

        <h2 style={h2Style}>4. Сделки между пользователями</h2>
        <p style={pStyle}>
          AdverLink не гарантирует результат сделок между рекламодателями и владельцами каналов и
          не несёт ответственности за качество размещённой рекламы, соблюдение договорённостей или
          причинённые убытки. На данный момент платформа не обрабатывает платежи между
          пользователями — все финансовые расчёты стороны производят самостоятельно, за пределами
          платформы, на свой риск.
        </p>

        <h2 style={h2Style}>5. Подписки и платные функции</h2>
        <p style={pStyle}>
          Возможности тарифных планов (Free, Pro, Business) описаны в соответствующем разделе
          платформы и могут изменяться. Оплата подписок в текущей версии сервиса носит
          демонстрационный характер до момента запуска официальной обработки платежей.
        </p>

        <h2 style={h2Style}>6. Интеллектуальная собственность</h2>
        <p style={pStyle}>
          Все права на дизайн, логотип и программный код платформы AdverLink принадлежат её
          создателям. Пользователи сохраняют права на публикуемый ими контент (описания, фото,
          тексты), но предоставляют AdverLink право отображать этот контент в рамках работы
          платформы.
        </p>

        <h2 style={h2Style}>7. Ограничение ответственности</h2>
        <p style={pStyle}>
          Платформа предоставляется &quot;как есть&quot;. AdverLink не гарантирует бесперебойную
          работу сервиса и не несёт ответственности за косвенные убытки, возникшие в результате
          использования платформы.
        </p>

        <h2 style={h2Style}>8. Изменение условий</h2>
        <p style={pStyle}>
          AdverLink может обновлять данные условия. Актуальная версия всегда доступна по этой
          ссылке, дата обновления указывается вверху страницы.
        </p>

        <h2 style={h2Style}>9. Контакты</h2>
        <p style={pStyle}>
          По всем вопросам, связанным с настоящими условиями, вы можете связаться с нами через
          контакты, указанные на сайте.
        </p>
      </article>
    </div>
  )
}
