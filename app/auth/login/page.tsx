'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  padding: '12px 16px',
  color: 'white',
  fontSize: '14px',
  outline: 'none',
  marginBottom: '10px',
  boxSizing: 'border-box',
}

const socialButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  padding: '12px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '12px',
  color: 'white',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s',
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const switchMode = (next: 'login' | 'register' | 'forgot') => {
    setMode(next)
    setError('')
    setSuccess('')
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  const handleAppleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/login/password`,
      })
      if (resetError) setError(resetError.message)
      else setSuccess(`Ссылка отправлена на ${email}`)
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError('Неверный email или пароль')
      else router.push('/dashboard')
    } else {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (signUpError) setError(signUpError.message)
      else setSuccess('Аккаунт создан! Проверьте email для подтверждения.')
    }

    setLoading(false)
  }

  const subtitle =
    mode === 'login'
      ? 'С возвращением 👋'
      : mode === 'register'
        ? 'Создай аккаунт бесплатно'
        : 'Восстановление пароля'

  const mainButtonLabel =
    loading
      ? 'Загрузка...'
      : mode === 'login'
        ? 'Войти'
        : mode === 'register'
          ? 'Создать аккаунт'
          : 'Отправить ссылку'

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
      <style>{`
        .auth-login-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .auth-social-btn:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          border-color: rgba(255, 255, 255, 0.25) !important;
        }
        .auth-mode-btn:hover {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        .auth-link-btn:hover {
          color: rgba(255, 255, 255, 0.7) !important;
        }
      `}</style>

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
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <Link
            href="/"
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            Adver<span style={{ color: '#7c3aed' }}>Link</span>
          </Link>
        </div>

        <p
          style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '15px',
            marginBottom: '28px',
          }}
        >
          {subtitle}
        </p>

        {mode !== 'forgot' && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '999px',
              padding: '4px',
            }}
          >
            <button
              type="button"
              className="auth-mode-btn"
              onClick={() => switchMode('login')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '999px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: mode === 'login' ? 'var(--accent-primary, #9333ea)' : 'transparent',
                color: mode === 'login' ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            >
              Вход
            </button>
            <button
              type="button"
              className="auth-mode-btn"
              onClick={() => switchMode('register')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '999px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: mode === 'register' ? 'var(--accent-primary, #9333ea)' : 'transparent',
                color: mode === 'register' ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            >
              Регистрация
            </button>
          </div>
        )}

        {mode === 'forgot' ? (
          <>
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
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#4ade80',
                  fontSize: '13px',
                  marginBottom: '12px',
                  textAlign: 'center',
                }}
              >
                {success}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-login-input"
              style={{ ...inputStyle, marginBottom: '16px' }}
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: 'var(--accent-primary, #9333ea)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
                marginBottom: '16px',
              }}
            >
              {mainButtonLabel}
            </button>

            <button
              type="button"
              className="auth-link-btn"
              onClick={() => switchMode('login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '13px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center',
              }}
            >
              ← Вернуться ко входу
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="auth-social-btn"
              onClick={handleGoogleLogin}
              style={{ ...socialButtonStyle, marginBottom: '10px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Продолжить с Google
            </button>

            <button
              type="button"
              className="auth-social-btn"
              onClick={handleAppleLogin}
              style={{ ...socialButtonStyle, marginBottom: '16px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Продолжить с Apple
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 16px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>или</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </div>

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
                  textAlign: 'center',
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#4ade80',
                  fontSize: '13px',
                  marginBottom: '12px',
                  textAlign: 'center',
                }}
              >
                {success}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-login-input"
              style={inputStyle}
            />

            {mode === 'register' && (
              <input
                type="text"
                placeholder="Имя (необязательно)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="auth-login-input"
                style={inputStyle}
              />
            )}

            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-login-input"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '12px 44px 12px 16px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)',
                }}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                <i
                  className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`}
                  style={{ fontSize: '18px' }}
                />
              </button>
            </div>

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Забыл пароль?
                </button>
              </div>
            )}

            {mode === 'register' && <div style={{ marginBottom: '6px' }} />}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: 'var(--accent-primary, #9333ea)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
                marginBottom: '16px',
              }}
            >
              {mainButtonLabel}
            </button>

            {mode === 'register' && (
              <p
                style={{
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: '11px',
                  textAlign: 'center',
                  lineHeight: '1.5',
                  marginBottom: '16px',
                }}
              >
                Регистрируясь, вы соглашаетесь с{' '}
                <a
                  href="/legal/terms"
                  style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}
                >
                  Условиями использования
                </a>{' '}
                и{' '}
                <a
                  href="/legal/privacy"
                  style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'underline' }}
                >
                  Политикой конфиденциальности
                </a>
              </p>
            )}

            <p
              style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '14px',
              }}
            >
              {mode === 'login' ? (
                <>
                  Нет аккаунта?{' '}
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => switchMode('register')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Зарегистрироваться
                  </button>
                </>
              ) : (
                <>
                  Уже есть аккаунт?{' '}
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => switchMode('login')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Войти
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
