'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
    <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>
      Загрузка...
    </div>
  )

  return (
    <div style={{ maxWidth: '680px' }}>

      {/* ── PROFILE HEADER ── */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '28px',
        marginBottom: '16px',
      }}>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar"
                style={{ width: '96px', height: '96px', borderRadius: '50%',
                  objectFit: 'cover', border: '3px solid rgba(255,255,255,0.15)' }} />
            ) : (
              <div style={{ width: '96px', height: '96px', borderRadius: '50%',
                backgroundColor: 'var(--accent-primary, #9333ea)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '38px', fontWeight: '700',
                border: '3px solid rgba(255,255,255,0.15)' }}>
                {user.email?.[0].toUpperCase()}
              </div>
            )}

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
              <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '700', margin: 0 }}>
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
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', margin: '0 0 8px' }}>
                @{profile.username}
              </p>
            )}

            {/* Email */}
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', margin: '0 0 10px' }}>
              {user.email}
            </p>

            {/* Description */}
            {profile?.description && !editing && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px',
                lineHeight: '1.5', margin: '0 0 12px' }}>
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
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={() => setEditing(!editing)}
            style={{
              flexShrink: 0,
              background: editing ? 'rgba(255,255,255,0.08)' : 'var(--accent-primary, #9333ea)',
              color: 'white', border: 'none', borderRadius: '12px',
              padding: '8px 18px', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <i className={`ti ${editing ? 'ti-x' : 'ti-edit'}`} style={{ fontSize: '14px' }} />
            {editing ? 'Отмена' : 'Редактировать'}
          </button>
        </div>

        {/* ── EDIT FORM (shown when editing) ── */}
        {editing && (
          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px',
                textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Имя
              </label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Твоё имя"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                  padding: '10px 14px', color: 'white', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px',
                textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%',
                  transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }}>@</span>
                <input value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                    padding: '10px 14px 10px 28px', color: 'white', fontSize: '14px',
                    outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px',
                textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                О себе
              </label>
              <textarea value={description}
                onChange={e => setDescription(e.target.value.slice(0, 200))}
                placeholder="Расскажи о себе..."
                rows={3}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                  padding: '10px 14px', color: 'white', fontSize: '14px',
                  outline: 'none', resize: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box' }} />
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px',
                textAlign: 'right', margin: '2px 0 0' }}>
                {description.length}/200
              </p>
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{error}</p>}
            {success && <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>{success}</p>}

            <button onClick={handleSave} disabled={saving}
              style={{ backgroundColor: 'var(--accent-primary, #9333ea)',
                color: 'white', border: 'none', borderRadius: '10px',
                padding: '12px', fontSize: '14px', fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1, width: '100%' }}>
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px', padding: '4px' }}>
        {[
          { key: 'channels', label: 'Каналы', icon: 'ti-brand-telegram', count: channels.length },
          { key: 'reviews', label: 'Отзывы', icon: 'ti-star', count: reviews.length },
          { key: 'stats', label: 'Статистика', icon: 'ti-chart-bar', count: null },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'channels' | 'reviews' | 'stats')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '10px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              background: activeTab === tab.key
                ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s',
            }}
          >
            <i className={`ti ${tab.icon}`} style={{ fontSize: '15px' }} />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span style={{ background: 'rgba(255,255,255,0.15)',
                borderRadius: '20px', padding: '1px 7px', fontSize: '11px' }}>
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
            <div style={{ textAlign: 'center', padding: '48px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
              <i className="ti ti-brand-telegram"
                style={{ fontSize: '40px', color: 'rgba(255,255,255,0.15)', display: 'block', marginBottom: '12px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 16px' }}>
                У вас пока нет каналов
              </p>
              <button
                onClick={() => router.push('/dashboard/add-channel')}
                style={{ backgroundColor: 'var(--accent-primary, #9333ea)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
                + Добавить канал
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {channels.map(channel => (
                <div key={channel.id}
                  onClick={() => router.push(`/dashboard/edit-channel/${channel.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '16px 20px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  }}
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
                      <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>
                        {channel.name}
                      </span>
                      {channel.is_verified && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="11" fill="#22c55e"/>
                          <path d="M7.5 12.5L10.5 15.5L16.5 9" stroke="white"
                            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                      @{channel.telegram_username}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
                        {channel.subscriber_count >= 1000
                          ? (channel.subscriber_count/1000).toFixed(1)+'K'
                          : channel.subscriber_count || 0}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>подп.</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--accent-primary, #9333ea)', fontSize: '13px', fontWeight: '600' }}>
                        {channel.ad_price ? channel.ad_price + ' ' + (channel.ad_price_currency || 'USD') : '—'}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>цена</div>
                    </div>
                  </div>

                  <i className="ti ti-chevron-right"
                    style={{ fontSize: '16px', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                </div>
              ))}

              <button
                onClick={() => router.push('/dashboard/add-channel')}
                style={{ background: 'rgba(255,255,255,0.04)',
                  border: '1px dashed rgba(255,255,255,0.12)',
                  borderRadius: '14px', padding: '14px',
                  color: 'rgba(255,255,255,0.3)', fontSize: '13px',
                  cursor: 'pointer', width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
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
            <div style={{ textAlign: 'center', padding: '48px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px' }}>
              <i className="ti ti-star" style={{ fontSize: '40px', color: 'rgba(255,255,255,0.15)',
                display: 'block', marginBottom: '12px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>
                Отзывов пока нет
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reviews.map(review => (
                <div key={review.id} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px', padding: '16px 20px',
                }}>
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
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                      {new Date(review.created_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  {review.comment && (
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px',
                      lineHeight: '1.5', margin: 0 }}>
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {activeTab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Каналов', value: channels.length, icon: 'ti-brand-telegram' },
            { label: 'Завершённых сделок', value: completedDeals, icon: 'ti-check' },
            { label: 'Отзывов', value: reviews.length, icon: 'ti-star' },
            { label: 'Средний рейтинг', value: avgRating ? avgRating + ' ★' : '—', icon: 'ti-award' },
            { label: 'Подписчиков всего', value: channels.reduce((s: number, c: any) => s + (c.subscriber_count || 0), 0).toLocaleString(), icon: 'ti-users' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '20px',
              textAlign: 'center',
            }}>
              <i className={`ti ${stat.icon}`}
                style={{ fontSize: '24px', color: 'var(--accent-primary, #9333ea)',
                  display: 'block', marginBottom: '8px', opacity: 0.7 }} />
              <div style={{ color: 'white', fontSize: '20px', fontWeight: '700' }}>
                {stat.value}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '2px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
