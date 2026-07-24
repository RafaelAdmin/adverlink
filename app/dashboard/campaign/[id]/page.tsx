'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '16px',
}

export default function CampaignDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [campaign, setCampaign] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/auth/login')
        return
      }
      setUser(authUser)

      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('Кампания не найдена')
      } else {
        setCampaign(data)
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleRespond = async () => {
    if (!user) return

    const { data: myChannels } = await supabase
      .from('channels')
      .select('id, name')
      .eq('owner_id', user.id)

    if (!myChannels || myChannels.length === 0) {
      alert('Добавьте канал чтобы откликнуться на кампанию')
      return
    }

    router.push('/dashboard/marketplace')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return <div className="text-white/50">Загрузка...</div>
  }

  if (error || !campaign) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-white/50 hover:text-white transition text-sm mb-8 flex items-center gap-2"
        >
          ← Назад
        </button>
        <div style={glassCard} className="text-center text-white/70">
          {error || 'Кампания не найдена'}
        </div>
      </div>
    )
  }

  const budget = Number(campaign.budget) || 0
  const isActive = campaign.status === 'active'

  return (
    <div className="max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-white/50 hover:text-white transition text-sm mb-8 flex items-center gap-2"
      >
        ← Назад
      </button>

      <div style={glassCard}>
        <div className="flex flex-col items-center text-center">
          <div
            className="flex items-center justify-center mb-4"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(147,51,234,0.2)',
              border: '1px solid rgba(147,51,234,0.3)',
            }}
          >
            <i
              className="ti ti-speakerphone"
              style={{ fontSize: '28px', color: 'var(--accent-primary, #9333ea)' }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">{campaign.name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            {campaign.category && (
              <span
                className="text-sm px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(147,51,234,0.2)',
                  color: 'rgba(196,181,253,0.95)',
                  border: '1px solid rgba(147,51,234,0.3)',
                }}
              >
                {campaign.category}
              </span>
            )}
            <span
              className="text-sm px-3 py-1 rounded-full"
              style={
                isActive
                  ? {
                      background: 'rgba(34,197,94,0.15)',
                      color: '#4ade80',
                      border: '1px solid rgba(34,197,94,0.3)',
                    }
                  : {
                      background: 'rgba(59,130,246,0.15)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59,130,246,0.3)',
                    }
              }
            >
              {isActive ? 'Активна' : 'Завершена'}
            </span>
          </div>
          {campaign.advertiser_email && (
            <p className="text-white/40 text-sm">
              Рекламодатель: <span className="text-white/60">{campaign.advertiser_email}</span>
            </p>
          )}
        </div>
      </div>

      <div style={glassCard}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-white/40 text-xs mb-1">Бюджет</p>
            <p className="text-white font-medium">
              {budget.toLocaleString()} AMD
              {budget > 0 && (
                <span className="text-white/40 text-sm"> ≈ ${Math.round(budget / 385)}</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Целевая аудитория</p>
            <p className="text-white font-medium">{campaign.target_audience || '—'}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Желаемая дата</p>
            <p className="text-white font-medium">{formatDate(campaign.preferred_date)}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Мин. подписчиков</p>
            <p className="text-white font-medium">
              {campaign.min_subscribers > 0
                ? Number(campaign.min_subscribers).toLocaleString()
                : 'Не указано'}
            </p>
          </div>
        </div>
      </div>

      {campaign.description && (
        <div style={glassCard}>
          <h2 className="text-white/50 text-xs uppercase tracking-wider mb-3">Описание кампании</h2>
          <p className="text-white/80 text-sm leading-relaxed">{campaign.description}</p>
        </div>
      )}

      {campaign.requirements && (
        <div style={glassCard}>
          <h2 className="text-white/50 text-xs uppercase tracking-wider mb-3">Особые требования</h2>
          <p className="text-white/80 text-sm leading-relaxed">{campaign.requirements}</p>
        </div>
      )}

      {campaign.product_link && (
        <div style={glassCard}>
          <p className="text-white/50 text-sm mb-2">Ссылка на продукт:</p>
          <a
            href={campaign.product_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:opacity-80 text-sm break-all transition"
          >
            {campaign.product_link}
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={handleRespond}
        className="w-full py-3.5 rounded-xl text-white font-medium text-sm transition hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
      >
        Откликнуться на кампанию
      </button>
    </div>
  )
}
