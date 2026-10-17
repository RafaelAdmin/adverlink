'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AUTH_RESEND_EMAIL_WINDOW_MS } from '@/lib/auth-rate-limit'
import { isValidEmail } from '@/lib/auth-urls'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  const [email, setEmail] = useState(initialEmail)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!cooldownUntil) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [cooldownUntil])

  const remainingMs = Math.max(0, cooldownUntil - now)
  const remainingSec = Math.ceil(remainingMs / 1000)
  const canResend = remainingMs <= 0 && !loading

  const resend = async () => {
    setError('')
    setMessage('')
    if (!isValidEmail(email)) {
      setError('Укажите корректный email-адрес')
      return
    }
    if (!canResend) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Не удалось отправить письмо')
        if (res.status === 429) {
          setCooldownUntil(Date.now() + AUTH_RESEND_EMAIL_WINDOW_MS)
        }
        return
      }
      setMessage(data.message || 'Письмо отправлено')
      setCooldownUntil(Date.now() + AUTH_RESEND_EMAIL_WINDOW_MS)
    } catch {
      setError('Не удалось отправить письмо. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="landing-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
      }}
    >
      <div className="landing-orb landing-orb--1" aria-hidden />
      <div className="landing-orb landing-orb--2" aria-hidden />
      <div className="landing-orb landing-orb--3" aria-hidden />
      <div className="landing-orb landing-orb--4" aria-hidden />

      <Link
        href="/auth/login"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '14px',
          textDecoration: 'none',
          zIndex: 2,
        }}
      >
        ← Ко входу
      </Link>

      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px' }}>
          Проверьте почту
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', lineHeight: 1.6, margin: '0 0 20px' }}>
          Мы отправили письмо со ссылкой для подтверждения. Откройте его и перейдите по ссылке,
          чтобы войти в AdverLink. Письмо может попасть в «Спам».
        </p>

        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '12px',
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#4ade80',
              fontSize: '13px',
              marginBottom: '12px',
            }}
          >
            {message}
          </div>
        )}

        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '8px' }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="auth-login-input"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: 'white',
            fontSize: '14px',
            outline: 'none',
            marginBottom: '16px',
            boxSizing: 'border-box',
          }}
        />

        <button
          type="button"
          onClick={resend}
          disabled={!canResend}
          style={{
            width: '100%',
            backgroundColor: 'var(--accent-primary, #9333ea)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '13px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: canResend ? 'pointer' : 'not-allowed',
            opacity: canResend ? 1 : 0.7,
            marginBottom: '12px',
          }}
        >
          {loading
            ? 'Отправляем...'
            : remainingSec > 0
              ? `Повторная отправка через ${remainingSec} с`
              : 'Отправить письмо ещё раз'}
        </button>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', margin: 0 }}>
          Уже подтвердили?{' '}
          <Link href="/auth/login" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className="text-white/50 p-8">Загрузка...</div>}>
      <CheckEmailContent />
    </Suspense>
  )
}
