'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleReset = async () => {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage('Ошибка: ' + error.message)
    } else {
      setMessage('Пароль успешно изменён!')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center px-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-md">
        <div className="text-white text-2xl font-bold mb-8">
          Adver<span className="text-purple-400">Link</span>
        </div>
        <h1 className="text-white text-2xl font-semibold mb-2">Новый пароль</h1>
        <p className="text-white/50 text-sm mb-8">Введи новый пароль для своего аккаунта</p>

        <div className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Новый пароль"
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
            onClick={handleReset}
            disabled={loading || !password}
            className="bg-purple-600 hover:bg-purple-500 transition text-white py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </div>
      </div>
    </div>
  )
}