'use client'

/*
Run in Supabase SQL Editor if columns don't exist:
alter table ad_requests add column if not exists advertiser_id uuid references profiles(id);
alter table ad_requests add column if not exists advertiser_email text;
alter table ad_requests add column if not exists payment_status text default 'pending';
alter table ad_requests add column if not exists updated_at timestamp with time zone default now();
*/

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { DealPaymentModal } from '@/app/dashboard/components/DealManagement'
import PageHeader from '@/components/ui/PageHeader'
import Surface from '@/components/ui/Surface'
import Button from '@/components/ui/Button'

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
  const [showPaymentModal, setShowPaymentModal] = useState(false)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelId || success) return
    setSubmitError(null)
    setShowPaymentModal(true)
  }

  const confirmPaymentAndSend = async () => {
    if (!channelId) return false

    setSubmitting(true)
    setSubmitError(null)

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    const advertiserContact = contact.trim() || authUser?.email || ''
    const now = new Date().toISOString()

    const { data: inserted, error } = await supabase
      .from('ad_requests')
      .insert({
        channel_id: channelId,
        advertiser_name: advertiserName.trim(),
        advertiser_contact: advertiserContact,
        message: message.trim(),
        budget: Number(budget),
        status: 'payment_pending',
        payment_status: 'manual',
        advertiser_id: authUser?.id || null,
        advertiser_email: authUser?.email || advertiserContact,
        updated_at: now,
      })
      .select('id')
      .single()

    setSubmitting(false)

    if (error) {
      setSubmitError(error.message)
      return false
    }

    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_ad_request',
          channelId: channelId,
          dealId: inserted.id,
          advertiserName: advertiserName.trim(),
          advertiserContact: advertiserContact,
          message: message.trim(),
          budget: Number(budget),
        }),
      })
    } catch {
      console.log('Notification failed silently')
    }

    setSuccess(true)
    return true
  }

  if (!user || loading) {
    return <div className="ui-meta">Загрузка...</div>
  }

  return (
    <div className="dashboard-form-inner">
      <DealPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={async () => {
          const ok = await confirmPaymentAndSend()
          if (ok) setShowPaymentModal(false)
          return ok
        }}
        budget={budget}
        channel={channel}
        title="Отправить заявку"
        subtitle="Beta: оплата согласуется напрямую с создателем"
        confirmLabel="Отправить заявку"
        saving={submitting}
      />

      <Link
        href="/dashboard/marketplace"
        className="ui-meta mb-8 inline-flex items-center gap-2 hover:opacity-80 transition"
      >
        ← Назад
      </Link>

      {loadError ? (
        <Surface padding="lg" className="text-center">
          <p className="ui-body">{loadError}</p>
        </Surface>
      ) : success ? (
        <Surface padding="lg" className="text-center">
          <div className="text-4xl mb-4">✓</div>
          <p className="ui-card-title mb-2">Запрос отправлен!</p>
          <p className="ui-meta">
            Владелец канала увидит ваш запрос. Оплату стороны согласуют напрямую (Beta).
          </p>
        </Surface>
      ) : (
        <>
          <PageHeader
            title="Запросить рекламу"
            description={
              channel
                ? `Канал: ${channel.name}${channel.telegram_username ? ` · @${channel.telegram_username}` : ''}`
                : undefined
            }
          />

          <form onSubmit={handleSubmit}>
            <Surface padding="lg" className="flex flex-col gap-5">
              <label className="ui-field">
                <span className="ui-field__label">Имя рекламодателя</span>
                <input
                  required
                  value={advertiserName}
                  onChange={(e) => setAdvertiserName(e.target.value)}
                  className="ui-input"
                />
              </label>

              <label className="ui-field">
                <span className="ui-field__label">Контакт</span>
                <input
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="@telegram or email"
                  className="ui-input"
                />
              </label>

              <label className="ui-field">
                <span className="ui-field__label">Бюджет</span>
                <input
                  type="number"
                  required
                  min={0}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="100"
                  className="ui-input"
                />
              </label>

              <label className="ui-field">
                <span className="ui-field__label">Сообщение</span>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what you want to advertise"
                  rows={4}
                  className="ui-input ui-textarea"
                />
              </label>

              {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

              <Button type="submit" disabled={submitting} fullWidth>
                {submitting ? 'Отправка...' : 'Оплатить и отправить запрос'}
              </Button>
            </Surface>
          </form>
        </>
      )}
    </div>
  )
}
