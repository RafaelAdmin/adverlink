import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
      }}
    >
      <div style={{ fontSize: '64px', fontWeight: '800', color: 'rgba(255,255,255,0.1)' }}>
        404
      </div>
      <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '600', textAlign: 'center' }}>
        Страница не найдена
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center' }}>
        Эта страница не существует или была удалена
      </p>
      <Link
        href="/"
        style={{
          backgroundColor: 'var(--accent-primary, #9333ea)',
          color: 'white',
          borderRadius: '20px',
          padding: '10px 24px',
          fontSize: '14px',
          textDecoration: 'none',
          marginTop: '8px',
        }}
      >
        На главную
      </Link>
    </div>
  )
}
