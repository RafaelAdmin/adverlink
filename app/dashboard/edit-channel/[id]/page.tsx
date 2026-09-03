'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { getChannelHandle } from '@/lib/channel-helpers'
import PlatformBadge from '@/app/dashboard/components/PlatformBadge'
import ProReportGenerator from '@/app/dashboard/components/ProReportGenerator'
import TelegramAnalyticsConnect from '@/app/dashboard/components/TelegramAnalyticsConnect'
import CurrencySelector from '@/app/dashboard/components/CurrencySelector'
import { CurrencyCode } from '@/lib/currency'
import PageHeader from '@/components/ui/PageHeader'
import Surface from '@/components/ui/Surface'
import Button from '@/components/ui/Button'

export default function EditChannelPage() {
  const [channel, setChannel] = useState<any>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, is_admin')
        .eq('id', user.id)
        .single()
      setIsPro(profile?.subscription_plan === 'pro' || profile?.is_admin === true)

      const { data } = await supabase
        .from('channels')
        .select('*')
        .eq('id', params.id)
        .eq('owner_id', user.id)
        .single()

      if (!data) { router.push('/dashboard'); return }
      setOwnerId(user.id)
      setChannel(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const name = (channel.name || '').trim().slice(0, 100)
    const description = (channel.description || '').trim().slice(0, 1000)
    const adPrice = Math.max(0, Number(channel.ad_price) || 0)
    const avgViews = Math.max(0, Number(channel.avg_views) || 0)

    const { error } = await supabase
      .from('channels')
      .update({
        name,
        description,
        avg_views: avgViews,
        ad_price: adPrice,
        ad_price_currency: channel.ad_price_currency || 'USD',
        language: channel.language,
        country: channel.country,
      })
      .eq('id', channel.id)
      .eq('owner_id', ownerId!)

    setSaving(false)
    if (error) setError(error.message)
    else setSuccess(true)
  }

  const handleDelete = async () => {
    if (!channel || !ownerId) return
    setDeleting(true)
    setError(null)

    const { error: deleteError } = await supabase
      .from('channels')
      .delete()
      .eq('id', channel.id)
      .eq('owner_id', ownerId)

    setDeleting(false)

    if (deleteError) {
      setError(deleteError.message)
      setShowDeleteConfirm(false)
      return
    }

    router.push('/dashboard?channelDeleted=1')
  }

  if (loading) return (
    <div className="ui-meta text-center py-24">Загрузка...</div>
  )

  return (
    <div className="dashboard-form-inner">
      <Link
        href="/dashboard"
        className="ui-meta mb-8 inline-flex items-center gap-2 hover:opacity-80 transition"
      >
        ← Назад к дашборду
      </Link>

      <PageHeader title="Редактировать канал" description="Обнови информацию о своём канале" />

      <Surface padding="lg" className="flex flex-col gap-5">

        {/* Аватар и название */}
        <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {channel.avatar_url ? (
            <img src={channel.avatar_url} alt={channel.name} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full avatar-accent-fallback flex items-center justify-center text-white font-bold text-xl">
              {channel.name[0]}
            </div>
          )}
          <div>
            <div className="text-white font-semibold flex items-center gap-2 flex-wrap">
              {channel.name}
              <PlatformBadge platform={channel.platform} />
            </div>
            <div className="ui-meta">{getChannelHandle(channel)}</div>
            <div className={`text-xs mt-1 ${
              channel.verification_status === 'verified' ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {channel.verification_status === 'verified' ? '✓ Верифицирован' : '⏳ На проверке'}
            </div>
          </div>
        </div>

        {/* Название */}
        <label className="ui-field">
          <span className="ui-field__label">Название канала</span>
          <input
            value={channel.name}
            onChange={(e) => setChannel({ ...channel, name: e.target.value })}
            className="ui-input"
          />
        </label>

        {/* Описание */}
        <label className="ui-field">
          <span className="ui-field__label">Описание</span>
          <textarea
            value={channel.description || ''}
            onChange={(e) => setChannel({ ...channel, description: e.target.value })}
            rows={3}
            className="ui-input ui-textarea"
          />
        </label>

        {/* Охваты и цена */}
        <div className="grid grid-cols-2 gap-4">
          <label className="ui-field">
            <span className="ui-field__label">Средние охваты</span>
            <input
              type="number"
              value={channel.avg_views || 0}
              onChange={(e) => setChannel({ ...channel, avg_views: e.target.value })}
              className="ui-input"
            />
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Цена рекламы</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <CurrencySelector
                value={(channel.ad_price_currency || 'USD') as CurrencyCode}
                onChange={(currency) => setChannel({ ...channel, ad_price_currency: currency })}
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={channel.ad_price || 0}
                onChange={(e) => setChannel({ ...channel, ad_price: e.target.value })}
                className="ui-input flex-1"
              />
            </div>
            <span className="ui-field__hint">Цена сохраняется в выбранной валюте</span>
          </label>
        </div>

        {/* Язык и страна */}
        <div className="grid grid-cols-2 gap-4">
          <label className="ui-field">
            <span className="ui-field__label">Язык</span>
            <select
              value={channel.language || 'ru'}
              onChange={(e) => setChannel({ ...channel, language: e.target.value })}
              className="ui-input"
            >
              <option value="ru">Русский</option>
              <option value="hy">Армянский</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="ui-field">
            <span className="ui-field__label">Страна</span>
            <select
              value={channel.country || 'AM'}
              onChange={(e) => setChannel({ ...channel, country: e.target.value })}
              className="ui-input"
            >
              <option value="AM">Армения</option>
              <option value="RU">Россия</option>
              <option value="GE">Грузия</option>
            </select>
          </label>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">✓ Изменения сохранены</p>}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </Button>
      </Surface>

      <div style={{ marginTop: '24px' }}>
        <ProReportGenerator channel={channel} isPro={isPro} />
      </div>

      <TelegramAnalyticsConnect
        channelId={channel.id}
        analyticsStatus={channel.analytics_status}
        isVerified={channel.verification_status === 'verified'}
        platform={channel.platform}
        onConnected={() =>
          setChannel({ ...channel, analytics_status: 'connected' })
        }
      />

      <div
        style={{
          marginTop: '48px',
          paddingTop: '32px',
          borderTop: '1px solid rgba(239,68,68,0.15)',
        }}
      >
        <h2 style={{ color: '#f87171', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
          Опасная зона
        </h2>
        <p className="ui-meta mb-4" style={{ lineHeight: 1.5 }}>
          Удаление канала необратимо. Все заявки и сделки по этому каналу будут удалены без возможности восстановления.
        </p>
        <Button type="button" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
          Удалить канал
        </Button>
      </div>

      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
            aria-hidden
          />
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
            <div
              role="dialog"
              aria-modal="true"
              className="pointer-events-auto w-full max-w-md ui-profile-popup p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
                Удалить канал навсегда?
              </h3>
              <p className="ui-body mb-5" style={{ lineHeight: 1.6 }}>
                Это действие необратимо. Канал «{channel.name}» и{' '}
                <strong>вся история сделок и заявок</strong> по нему
                будут удалены из базы без возможности восстановления.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Отмена
                </Button>
                <Button type="button" variant="danger" size="sm" disabled={deleting} onClick={handleDelete}>
                  {deleting ? 'Удаление...' : 'Да, удалить'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}