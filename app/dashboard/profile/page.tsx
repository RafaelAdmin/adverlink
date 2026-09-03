'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import UserAvatar from '../components/UserAvatar'
import Surface from '@/components/ui/Surface'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [completedDeals, setCompletedDeals] = useState(0)
  const [activeTab, setActiveTab] = useState<'channels' | 'reviews' | 'stats'>('channels')
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [description, setDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const [profileRes, channelsRes, reviewsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('channels').select('*').eq('owner_id', user.id),
        supabase.from('reviews').select('*').eq('reviewee_id', user.id),
      ])

      const profile = profileRes.data
      const channels = channelsRes.data || []
      const reviews = reviewsRes.data || []

      setProfile(profile)
      setChannels(channels)
      setReviews(reviews)
      setFullName(profile?.full_name || '')
      setUsername(profile?.username || '')
      setDescription(profile?.description || '')
      setAvatarUrl(profile?.avatar_url || '')

      if (channels.length > 0) {
        const channelIds = channels.map((c: any) => c.id)
        const { count } = await supabase
          .from('ad_requests')
          .select('*', { count: 'exact', head: true })
          .in('channel_id', channelIds)
          .eq('status', 'completed')
        setCompletedDeals(count || 0)
      }
    }
    load()
  }, [])

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`
      await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(publicUrl)
      window.dispatchEvent(new Event('adverlink-avatar-updated'))
    } catch { setError('Ошибка загрузки фото') }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || null,
        description: description.trim().slice(0, 200) || null,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) setError('Ошибка: ' + error.message)
    else {
      setSuccess('✓ Сохранено!')
      setEditing(false)
      setTimeout(() => setSuccess(''), 2000)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
  }

  if (!user) return (
    <div className="ui-meta text-center py-16">Загрузка...</div>
  )

  return (
    <div>
      <PageHeader title="Профиль" description="Ваш публичный профиль и каналы" />

      <Surface padding="lg" className="mb-4">

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <UserAvatar
              src={avatarUrl}
              name={fullName || user.email}
              size={96}
              frameColor={profile?.avatar_frame_color}
              borderWidth={3}
            />

            {/* Admin crown */}
            {profile?.is_admin && (
              <div style={{
                position: 'absolute', top: '-8px', right: '-8px',
                fontSize: '18px', transform: 'rotate(25deg)',
                filter: 'drop-shadow(0 0 6px rgba(255,200,0,0.8))',
                animation: 'crownFloat 2s ease-in-out infinite',
              }}>👑</div>
            )}

            {/* Upload overlay (only in edit mode) */}
            {editing && (
              <label htmlFor="avatar-upload" style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%', cursor: 'pointer',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-camera" style={{ color: 'white', fontSize: '20px' }} />
                <input id="avatar-upload" type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={handleAvatarUpload} />
              </label>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Name + badges row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 className="ui-page-title m-0">
                {profile?.full_name || user.email?.split('@')[0]}
              </h1>

              {/* Badge */}
              {profile?.is_admin ? (
                <span style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)',
                  color: '#f87171', fontSize: '11px', fontWeight: '700',
                  padding: '3px 9px', borderRadius: '20px' }}>
                  🛡️ ADMIN
                </span>
              ) : profile?.subscription_plan === 'pro' ? (
                <span style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.35)',
                  color: '#fbbf24', fontSize: '11px', fontWeight: '700',
                  padding: '3px 9px', borderRadius: '20px' }}>
                  PRO
                </span>
              ) : (
                <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.3)', fontSize: '11px',
                  padding: '3px 9px', borderRadius: '20px' }}>
                  FREE
                </span>
              )}
            </div>

            {/* Username */}
            {profile?.username && (
              <p className="ui-meta mb-2">@{profile.username}</p>
            )}

            <p className="ui-meta mb-2.5" style={{ fontSize: '12px' }}>{user.email}</p>

            {profile?.description && !editing && (
              <p className="ui-body mb-3" style={{ lineHeight: 1.5 }}>
                {profile.description}
              </p>
            )}

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'каналов', value: channels.length },
                { label: 'сделок', value: completedDeals },
                { label: 'отзывов', value: reviews.length },
                { label: 'рейтинг', value: avgRating ? avgRating + ' ★' : '—' },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ color: 'white', fontSize: '16px', fontWeight: '700' }}>
                    {stat.value}
                  </div>
                  <div className="ui-meta" style={{ fontSize: '11px' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit button */}
          <Button
            onClick={() => setEditing(!editing)}
            variant={editing ? 'secondary' : 'primary'}
            size="sm"
            className="flex-shrink-0 whitespace-nowrap"
          >
            <i className={`ti ${editing ? 'ti-x' : 'ti-edit'}`} style={{ fontSize: '14px' }} />
            {editing ? 'Отмена' : 'Редактировать'}
          </Button>
        </div>

        {/* ── EDIT FORM (shown when editing) ── */}
        {editing && (
          <div className="mt-6 pt-6 flex flex-col gap-3.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <label className="ui-field">
              <span className="ui-field__label">Имя</span>
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Твоё имя" className="ui-input" />
            </label>

            <label className="ui-field">
              <span className="ui-field__label">Username</span>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 ui-meta">@</span>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  className="ui-input pl-7"
                />
              </div>
            </label>

            <label className="ui-field">
              <span className="ui-field__label">О себе</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 200))}
                placeholder="Расскажи о себе..."
                rows={3}
                className="ui-input ui-textarea"
              />
              <span className="ui-field__hint text-right">{description.length}/200</span>
            </label>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-green-400 text-sm">{success}</p>}

            <Button onClick={handleSave} disabled={saving} fullWidth>
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        )}
      </Surface>

      {/* ── TABS ── */}
      <div className="ui-surface ui-surface--pad-sm mb-4 flex gap-1">
        {[
          { key: 'channels', label: 'Каналы', icon: 'ti-brand-telegram', count: channels.length },
          { key: 'reviews', label: 'Отзывы', icon: 'ti-star', count: reviews.length },
          { key: 'stats', label: 'Статистика', icon: 'ti-chart-bar', count: null },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'channels' | 'reviews' | 'stats')}
            className={`ui-btn ui-btn--sm flex-1 ${activeTab === tab.key ? 'ui-btn--secondary' : 'ui-btn--ghost'}`}
            style={activeTab === tab.key ? { background: 'var(--surface-hover, rgba(255,255,255,0.08))' } : undefined}
          >
            <i className={`ti ${tab.icon}`} style={{ fontSize: '15px' }} />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="ui-meta text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CHANNELS TAB ── */}
      {activeTab === 'channels' && (
        <div>
          {channels.length === 0 ? (
            <Surface padding="lg" className="ui-empty">
              <i className="ti ti-brand-telegram ui-empty__icon" />
              <p className="ui-empty__title">У вас пока нет каналов</p>
              <Button onClick={() => router.push('/dashboard/add-channel')}>+ Добавить канал</Button>
            </Surface>
          ) : (
            <div className="flex flex-col gap-2.5">
              {channels.map(channel => (
                <div
                  key={channel.id}
                  onClick={() => router.push(`/dashboard/edit-channel/${channel.id}`)}
                  className="ui-surface ui-surface--hover ui-surface--pad-sm flex items-center gap-3.5 cursor-pointer"
                >
                  {channel.avatar_url ? (
                    <img src={channel.avatar_url} alt={channel.name} style={{ width: '44px', height: '44px',
                      borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary, #9333ea)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '18px', fontWeight: '700', flexShrink: 0 }}>
                      {channel.name[0]}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ui-card-title">{channel.name}</span>
                      {channel.is_verified && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="11" fill="#22c55e"/>
                          <path d="M7.5 12.5L10.5 15.5L16.5 9" stroke="white"
                            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="ui-meta">@{channel.telegram_username}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
                        {channel.subscriber_count >= 1000
                          ? (channel.subscriber_count/1000).toFixed(1)+'K'
                          : channel.subscriber_count || 0}
                      </div>
                      <div className="ui-meta" style={{ fontSize: '10px' }}>подп.</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--accent-primary, #9333ea)', fontSize: '13px', fontWeight: '600' }}>
                        {channel.ad_price ? channel.ad_price + ' ' + (channel.ad_price_currency || 'USD') : '—'}
                      </div>
                      <div className="ui-meta" style={{ fontSize: '10px' }}>цена</div>
                    </div>
                  </div>

                  <i className="ti ti-chevron-right ui-meta" style={{ fontSize: '16px', flexShrink: 0 }} />
                </div>
              ))}

              <button
                onClick={() => router.push('/dashboard/add-channel')}
                className="ui-surface ui-surface--pad-sm w-full flex items-center justify-center gap-1.5 ui-meta cursor-pointer"
                style={{ borderStyle: 'dashed' }}
              >
                <i className="ti ti-plus" style={{ fontSize: '14px' }} />
                Добавить ещё канал
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── REVIEWS TAB ── */}
      {activeTab === 'reviews' && (
        <div>
          {reviews.length === 0 ? (
            <Surface padding="lg" className="ui-empty">
              <i className="ti ti-star ui-empty__icon" />
              <p className="ui-empty__title">Отзывов пока нет</p>
            </Surface>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reviews.map(review => (
                <Surface key={review.id} padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {[1,2,3,4,5].map(star => (
                        <span key={star} style={{
                          color: star <= review.rating ? '#eab308' : 'rgba(255,255,255,0.15)',
                          fontSize: '16px',
                        }}>★</span>
                      ))}
                    </div>
                    <span className="ui-meta text-xs">
                      {new Date(review.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="ui-body" style={{ lineHeight: 1.5 }}>
                      {review.comment}
                    </p>
                  )}
                </Surface>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {activeTab === 'stats' && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {[
            { label: 'Каналов', value: channels.length, icon: 'ti-brand-telegram' },
            { label: 'Завершённых сделок', value: completedDeals, icon: 'ti-check' },
            { label: 'Отзывов', value: reviews.length, icon: 'ti-star' },
            { label: 'Средний рейтинг', value: avgRating ? avgRating + ' ★' : '—', icon: 'ti-award' },
            { label: 'Подписчиков всего', value: channels.reduce((s: number, c: any) => s + (c.subscriber_count || 0), 0).toLocaleString(), icon: 'ti-users' },
          ].map((stat, i) => (
            <div key={i} className="dashboard-stat-card text-center">
              <i className={`ti ${stat.icon}`}
                style={{ fontSize: '24px', color: 'var(--accent-primary, #9333ea)',
                  display: 'block', marginBottom: '8px', opacity: 0.7 }} />
              <div className="dashboard-stat-card__value">{stat.value}</div>
              <div className="dashboard-stat-card__label mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
