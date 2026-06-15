'use client'

/*
Run in Supabase SQL Editor if columns don't exist:
alter table ad_requests add column if not exists advertiser_id uuid references profiles(id);
alter table ad_requests add column if not exists advertiser_email text;
*/

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RequestAdPage() {
  const searchParams = useSearchParams()
  const channelId = searchParams.get('channelId')

  const [user, setUser] = useState<any>(null)
  const [channel, setChannel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [advertiserName, setAdvertiserName] = useState('')
  const [contact, setContact] = useState('')
  const [budget, setBudget] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const prefill = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setContact(user.email || '')
      }
    }
    prefill()
  }, [])

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      if (!channelId) {
        setLoadError('Канал не указан')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single()

      if (error || !data) {
        setLoadError('Канал не найден')
        setLoading(false)
        return
      }

      if (data.owner_id === user.id) {
        setLoadError('Нельзя отправить запрос на свой канал')
        setLoading(false)
        return
      }

      setChannel(data)
      setLoading(false)
    }
    load()
  }, [channelId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelId || success) return

    setSubmitting(true)
    setSubmitError(null)

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    const advertiserContact = contact.trim() || authUser?.email || ''

    const { error } = await supabase.from('ad_requests').insert({
      channel_id: channelId,
      advertiser_name: advertiserName.trim(),
      advertiser_contact: advertiserContact,
      message: message.trim(),
      budget: Number(budget),
      status: 'new',
      advertiser_id: authUser?.id || null,
      advertiser_email: authUser?.email || advertiserContact,
    })

    setSubmitting(false)

    if (error) {
      setSubmitError(error.message)
      return
    }

    setSuccess(true)
  }

  if (!user || loading) {
    return <div className="text-white/50">Загрузка...</div>
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/dashboard/marketplace"
        className="text-white/50 hover:text-white transition text-sm mb-8 inline-flex items-center gap-2"
      >
        ← Назад
      </Link>

      {loadError ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <p className="text-white/70">{loadError}</p>
        </div>
      ) : success ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">✓</div>
          <p className="text-white font-medium">
            Запрос отправлен! Владелец канала свяжется с тобой в Telegram.
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-white mb-2">Запросить рекламу</h1>
          {channel && (
            <p className="text-white/50 mb-8 text-sm">
              Канал: <span className="text-white">{channel.name}</span>
              {channel.telegram_username && (
                <span className="text-white/40"> · @{channel.telegram_username}</span>
              )}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-5"
          >
            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm">Имя рекламодателя</span>
              <input
                required
                value={advertiserName}
                onChange={(e) => setAdvertiserName(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm">Контакт</span>
              <input
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="@telegram or email"
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm">Бюджет</span>
              <input
                type="number"
                required
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="100"
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm">Сообщение</span>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what you want to advertise"
                rows={4}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-purple-500 transition text-sm resize-none"
              />
            </label>

            {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition text-white rounded-full px-6 py-2.5 text-sm font-medium mt-2"
            >
              {submitting ? 'Отправка...' : 'Отправить запрос'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
