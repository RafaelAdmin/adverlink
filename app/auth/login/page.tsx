'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async () => {
    setLoading(true)
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Проверь почту — мы отправили письмо для подтверждения')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center px-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-md">
        
        <Link href="/" className="text-white text-2xl font-bold tracking-tight block mb-8">
          Adver<span className="text-purple-400">Link</span>
        </Link>

        <h1 className="text-white text-2xl font-semibold mb-2">
          {isSignUp ? 'Создать аккаунт' : 'Войти'}
        </h1>
        <p className="text-white/50 text-sm mb-8">
          {isSignUp ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-purple-400 hover:text-purple-300 transition"
          >
            {isSignUp ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-purple-500 transition"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-purple-500 transition"
          />

          {message && (
            <p className="text-sm text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              {message}
            </p>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 transition text-white py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : isSignUp ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  )
}