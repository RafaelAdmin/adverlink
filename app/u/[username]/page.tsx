'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatAmdWithUsd } from '@/lib/currency'
import { getChannelHandle } from '@/lib/channel-helpers'
import PlatformBadge from '@/app/dashboard/components/PlatformBadge'
import VerifiedBadge from '@/app/dashboard/components/VerifiedBadge'

import { getLevelBadge } from '@/lib/profile'
export default function PublicProfilePage() {
  const params = useParams()
  const username = params.username as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [shareToast, setShareToast] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setNotFound(false)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (!profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData)

      const [channelsRes, reviewsRes, campaignsRes] = await Promise.all([
        supabase
          .from('channels')
          .select('id, name, telegram_username, avatar_url, subscriber_count, is_verified, ad_price, verification_status, platform')
          .eq('owner_id', profileData.id)
          .eq('is_active', true),
        supabase
          .from('reviews')
          .select('rating, comment, created_at')
          .eq('reviewee_id', profileData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('campaigns')
          .select('id, name, category, budget, description, status')
          .eq('advertiser_id', profileData.id)
          .eq('status', 'active'),
      ])

      setChannels(channelsRes.data || [])
      setReviews(reviewsRes.data || [])
      setCampaigns(campaignsRes.data || [])
      setLoading(false)
    }

    if (username) load()
  }, [username])

  useEffect(() => {
    if (!shareToast) return
    const t = setTimeout(() => setShareToast(false), 2000)
    return () => clearTimeout(t)
  }, [shareToast])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setShareToast(true)
  }

  if (loading) {
    return (
      <div className="bg-[#0a0a1a] min-h-screen flex items-center justify-center">
        <p className="text-white/50">Загрузка...</p>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="bg-[#0a0a1a] min-h-screen">
        <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none' }}>
            Adver<span style={{ color: 'var(--accent-primary, #9333ea)' }}>Link</span>
          </Link>
        </nav>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Пользователь не найден</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '24px' }}>
            Профиль @{username} не существует
          </p>
          <Link
            href="/"
            style={{
              backgroundColor: 'var(--accent-primary, #9333ea)',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '20px',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            На главную
          </Link>
        </div>
      </div>
    )
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
      : null
  const totalSubs = channels.reduce((s, c) => s + (Number(c.subscriber_count) || 0), 0)
  const levelBadge = getLevelBadge(profile.level_deals || 0)
  const hasVerifiedChannel = channels.some((c) => c.is_verified || c.verification_status === 'verified')
  const displayName = profile.full_name || profile.username || 'Пользователь'

  return (
    <div className="bg-[#0a0a1a] min-h-screen">
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none' }}>
          Adver<span style={{ color: 'var(--accent-primary, #9333ea)' }}>Link</span>
        </Link>
        <Link
          href="/auth/login"
          style={{
            backgroundColor: 'var(--accent-primary, #9333ea)',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '20px',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          Войти
        </Link>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '24px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              zIndex: 20,
            }}
          >
            {profile.is_admin ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(220,38,38,0.2)',
                  border: '1px solid rgba(220,38,38,0.4)',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                ADMIN
              </span>
            ) : profile.subscription_plan === 'pro' ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(234,179,8,0.15)',
                  border: '1px solid rgba(234,179,8,0.4)',
                  color: '#fbbf24',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 10px rgba(234,179,8,0.2)',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" stroke="#fbbf24" strokeWidth="2.5" />
                </svg>
                PRO
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}
              >
                FREE
              </span>
            )}
          </div>

          <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {profile.is_founder && (
              <span style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24', fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px' }}>
                FOUNDER
              </span>
            )}
            <button
              type="button"
              onClick={handleShare}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className="ti ti-share" style={{ fontSize: '14px' }} />
              Поделиться профилем
            </button>
          </div>

          {shareToast && (
            <div style={{
              position: 'absolute',
              top: '56px',
              right: '16px',
              background: 'rgba(74,222,128,0.15)',
              border: '1px solid rgba(74,222,128,0.3)',
              color: '#4ade80',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '10px',
            }}>
              Ссылка скопирована!
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url + '?t=' + new Date().getMinutes()}
                alt={displayName}
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--accent-primary, #9333ea)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '32px',
                fontWeight: 'bold',
                flexShrink: 0,
              }}>
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{displayName}</h1>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '4px' }}>@{profile.username}</div>
              {profile.description && (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '8px', marginBottom: 0, lineHeight: 1.5 }}>
                  {profile.description}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px' }}>
            {hasVerifiedChannel && (
              <VerifiedBadge gradId={`verifiedGrad-profile-${profile.id}`} />
            )}
            {levelBadge && (
              <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: levelBadge.color, fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}>
                {levelBadge.icon} {levelBadge.label}
              </span>
            )}
            {profile.is_founder && (
              <span style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#fbbf24', fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}>
                ⭐ Founder
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '24px' }}>
            {[
              { label: 'Рейтинг', value: avgRating ? `${avgRating} ★` : '—' },
              { label: 'Отзывов', value: reviews.length },
              { label: 'Каналов', value: channels.length },
              { label: 'Подписчиков', value: totalSubs.toLocaleString() },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 20px', textAlign: 'center' }}
              >
                <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>{stat.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {channels.length > 0 && (
          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Telegram каналы</h2>
            {channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/dashboard/channel/${channel.id}`}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
              >
                {channel.avatar_url ? (
                  <img src={channel.avatar_url} alt={channel.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary, #9333ea)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                  }}>
                    {channel.name?.[0]}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {channel.name}
                    <PlatformBadge platform={channel.platform} />
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    {getChannelHandle(channel)} · {Number(channel.subscriber_count || 0).toLocaleString()} подписчиков
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {(channel.is_verified || channel.verification_status === 'verified') && (
                      <VerifiedBadge gradId={`verifiedGrad-public-${channel.id}`} />
                    )}
                    {channel.ad_price > 0 && (
                      <span style={{ color: '#a855f7', fontSize: '12px' }}>{formatAmdWithUsd(channel.ad_price)}</span>
                    )}
                  </div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Подробнее →</span>
              </Link>
            ))}
          </section>
        )}

        {campaigns.length > 0 && (
          <section style={{ marginBottom: '24px' }}>
            <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Активные кампании</h2>
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{campaign.name}</span>
                  {campaign.category && (
                    <span style={{ background: 'rgba(147,51,234,0.2)', color: '#a855f7', fontSize: '11px', padding: '2px 10px', borderRadius: '20px' }}>
                      {campaign.category}
                    </span>
                  )}
                </div>
                <div style={{ color: '#a855f7', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  {formatAmdWithUsd(campaign.budget)}
                </div>
                {campaign.description && (
                  <p style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '13px',
                    margin: 0,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {campaign.description}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {reviews.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Отзывы</h2>
              <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', padding: '2px 10px', borderRadius: '20px' }}>
                {reviews.length}
              </span>
            </div>
            {reviews.slice(0, 5).map((review, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ marginBottom: '8px', fontSize: '16px', letterSpacing: '2px' }}>
                  <span style={{ color: '#eab308' }}>{'★'.repeat(review.rating)}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>{'☆'.repeat(5 - review.rating)}</span>
                </div>
                {review.comment && (
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '0 0 8px', lineHeight: 1.5 }}>
                    {review.comment}
                  </p>
                )}
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                  {new Date(review.created_at).toLocaleDateString('ru-RU')}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
