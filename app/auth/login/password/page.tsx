'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { mapAuthErrorMessage } from '@/lib/auth-errors'
import { isStrongEnoughPassword, MIN_PASSWORD_LENGTH } from '@/lib/auth-urls'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setHasSession(Boolean(data.session))
      setReady(true)
    }

    void sync()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(Boolean(session))
        setReady(true)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleReset = async () => {
    setError('')
    setSuccess('')

    if (!isStrongEnoughPassword(password)) {
      setError(`Пароль должен содержать не менее ${MIN_PASSWORD_LENGTH} символов`)
      return
    }
    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }
    if (!hasSession) {
      setError('Сессия восстановления не найдена. Запросите новую ссылку.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(mapAuthErrorMessage(updateError.message))
      setLoading(false)
      return
    }

    setSuccess('Пароль успешно изменён')
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  return (
    <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      <div className="landing-orb landing-orb--1" aria-hidden />
      <div className="landing-orb landing-orb--2" aria-hidden />

      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="text-white text-2xl font-bold mb-6">
          Adver<span style={{ color: '#7c3aed' }}>Link</span>
        </div>
        <h1 className="text-white text-2xl font-semibold mb-2">Новый пароль</h1>
        <p className="text-white/50 text-sm mb-6">Введите новый пароль для своего аккаунта</p>

        {ready && !hasSession && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            Ссылка недействительна или истекла.{' '}
            <Link href="/auth/login" className="underline text-white/80">
              Запросить новую
            </Link>
          </p>
        )}

        <div className="flex flex-col gap-4">
          <input
            type="password"
            placeholder={`Новый пароль (от ${MIN_PASSWORD_LENGTH} символов)`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none"
          />
          <input
            type="password"
            placeholder="Повторите пароль"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none"
          />

          {error && (
            <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-300 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              {success}
            </p>
          )}

          <button
            type="button"
            onClick={handleReset}
            disabled={loading || !password || !hasSession}
            className="bg-purple-600 hover:bg-purple-500 transition text-white py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </div>
      </div>
    </div>
  )
}
