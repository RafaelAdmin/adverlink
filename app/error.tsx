'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

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
      <div style={{ fontSize: '48px' }}>⚠️</div>
      <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '600', textAlign: 'center' }}>
        Что-то пошло не так
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', maxWidth: '400px' }}>
        Произошла непредвиденная ошибка. Попробуй обновить страницу.
      </p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <button
          onClick={reset}
          style={{
            backgroundColor: 'var(--accent-primary, #9333ea)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            padding: '10px 24px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Попробовать снова
        </button>
        <Link
          href="/"
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '10px 24px',
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          На главную
        </Link>
      </div>
    </div>
  )
}
