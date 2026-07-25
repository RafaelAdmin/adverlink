'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getChannelHandle } from '@/lib/channel-helpers'
import PlatformBadge from './PlatformBadge'

interface UserProfileCardProps {
  profileId: string
  onClose: () => void
}

import { getLevelBadge } from '@/lib/profile'
export default function UserProfileCard({ profileId, onClose }: UserProfileCardProps) {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'friends' | 'sent' | 'received'>('none')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, channelsRes, reviewsRes, campaignsRes, friendshipRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profileId).single(),
        supabase
          .from('channels')
          .select('id, name, telegram_username, avatar_url, subscriber_count, is_verified, platform')
          .eq('owner_id', profileId)
          .eq('is_active', true),
        supabase.from('reviews').select('rating').eq('reviewee_id', profileId),
        supabase
          .from('campaigns')
          .select('id, name, status, budget, category, description, created_at')
          .eq('advertiser_id', profileId)
          .eq('status', 'active'),
        supabase
          .from('friendships')
          .select('*')
          .or(
            `and(requester_id.eq.${user.id},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${user.id})`,
          ),
      ])

      setProfile(profileRes.data)
      setChannels(channelsRes.data || [])
      setReviews(reviewsRes.data || [])
      setCampaigns(campaignsRes.data || [])

      const friendship = friendshipRes.data?.[0]
      if (friendship) {
        if (friendship.status === 'accepted') setFriendshipStatus('friends')
        else if (friendship.requester_id === user.id) setFriendshipStatus('sent')
        else setFriendshipStatus('received')
      }

      setLoading(false)
    }
    load()
  }, [profileId])

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
      : null

  const levelBadge = profile ? getLevelBadge(profile.level_deals || 0) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(15,12,41,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          width: '340px',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '24px',
          position: 'relative',
          animation: 'slideDown 0.2s ease-out',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            color: 'rgba(255,255,255,0.3)',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          <i className="ti ti-x" />
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i
              className="ti ti-loader"
              style={{
                fontSize: '32px',
                color: 'rgba(255,255,255,0.3)',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        ) : !profile ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
            Профиль не найден
          </div>
        ) : (
          <>
            {profile.is_admin && (
              <span
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(220,38,38,0.2)',
                  border: '1px solid rgba(220,38,38,0.4)',
                  color: '#f87171',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🛡️ ADMIN
              </span>
            )}

            {profile.subscription_plan === 'pro' && !profile.is_admin && (
              <span
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  backgroundColor: 'var(--accent-primary, #9333ea)',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '3px 10px',
                  borderRadius: '20px',
                }}
              >
                👑 PRO
              </span>
            )}

            {profile.is_founder && (
              <span
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '48px',
                  background: 'rgba(234,179,8,0.2)',
                  border: '1px solid rgba(234,179,8,0.4)',
                  color: '#fbbf24',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '3px 10px',
                  borderRadius: '20px',
                }}
              >
                🏆 Founder
              </span>
            )}

            <div style={{ position: 'relative', width: '80px', height: '80px', margin: '24px auto 8px' }}>
              {profile.is_admin && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '-3px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                    zIndex: 0,
                  }}
                />
              )}

              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url + '?t=' + new Date().getMinutes()}
                  alt={profile.full_name || 'User'}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    position: 'relative',
                    zIndex: 1,
                    border: '3px solid rgba(255,255,255,0.15)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary, #9333ea)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    position: 'relative',
                    zIndex: 1,
                    border: '3px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
                </div>
              )}

              {profile.is_admin && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    fontSize: '20px',
                    zIndex: 10,
                    transform: 'rotate(25deg)',
                    filter: 'drop-shadow(0 0 6px rgba(255,200,0,0.8))',
                    animation: 'crownFloat 2s ease-in-out infinite',
                  }}
                >
                  👑
                </div>
              )}
            </div>

            <h2
              style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: '700',
                textAlign: 'center',
                margin: '8px 0 2px',
              }}
            >
              {profile.full_name || 'Пользователь'}
            </h2>

            {profile.username && (
              <p
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '13px',
                  textAlign: 'center',
                  marginBottom: '4px',
                }}
              >
                @{profile.username}
              </p>
            )}

            {profile.is_admin && (
              <p
                style={{
                  color: '#f87171',
                  fontSize: '12px',
                  textAlign: 'center',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                🛡️ Администратор платформы
              </p>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px',
                margin: '12px 0',
              }}
            >
              {channels.some((c) => c.is_verified) && (
                <span
                  style={{
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#4ade80',
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                  }}
                >
                  ✓ Верифицирован
                </span>
              )}

              {levelBadge && (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: levelBadge.color,
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                  }}
                >
                  {levelBadge.icon} {levelBadge.label}
                </span>
              )}

              {profile.is_founder && (
                <span
                  style={{
                    background: 'rgba(234,179,8,0.15)',
                    border: '1px solid rgba(234,179,8,0.3)',
                    color: '#fbbf24',
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                  }}
                >
                  🏆 Founder
                </span>
              )}
            </div>

            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>
                  {avgRating ? `${avgRating} ★` : '—'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>рейтинг</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>{reviews.length}</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>отзывов</div>
              </div>
              {channels.length > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>{channels.length}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>каналов</div>
                </div>
              )}
              {campaigns.length > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>{campaigns.length}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>кампаний</div>
                </div>
              )}
            </div>

            {profile.description && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '6px',
                  }}
                >
                  О СЕБЕ
                </p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: '1.5' }}>
                  {profile.description}
                </p>
              </div>
            )}

            {channels.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>КАНАЛЫ</span>
                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 8px', borderRadius: '20px' }}>
                    {channels.length}
                  </span>
                </p>
                {channels.slice(0, 3).map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => {
                      router.push(`/dashboard/channel/${channel.id}`)
                      onClose()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      marginBottom: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                    }}
                  >
                    {channel.avatar_url ? (
                      <img
                        src={channel.avatar_url}
                        alt={channel.name}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-primary, #9333ea)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          flexShrink: 0,
                        }}
                      >
                        {channel.name[0]}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {channel.name}
                        <PlatformBadge platform={channel.platform} />
                        {channel.is_verified && (
                          <span style={{ color: '#4ade80', fontSize: '10px' }}>✓</span>
                        )}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                        {getChannelHandle(channel)}
                        {' · '}
                        {channel.subscriber_count >= 1000
                          ? Math.round(channel.subscriber_count / 1000) + 'K'
                          : channel.subscriber_count}{' '}
                        подписчиков
                      </div>
                    </div>
                    <i
                      className="ti ti-chevron-right"
                      style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}
                    />
                  </div>
                ))}
                {channels.length > 3 && (
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: '11px',
                      textAlign: 'center',
                      marginTop: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    +{channels.length - 3} ещё
                  </p>
                )}
              </div>
            )}

            {campaigns.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>АКТИВНЫЕ КАМПАНИИ</span>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '1px 8px',
                      borderRadius: '20px',
                    }}
                  >
                    {campaigns.length}
                  </span>
                </p>

                {campaigns.slice(0, 2).map((campaign) => (
                  <div
                    key={campaign.id}
                    onClick={() => {
                      router.push(`/dashboard/campaign/${campaign.id}`)
                      onClose()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      marginBottom: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'rgba(147,51,234,0.2)',
                        border: '1px solid rgba(147,51,234,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <i
                        className="ti ti-speakerphone"
                        style={{ fontSize: '16px', color: 'var(--accent-primary, #9333ea)' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {campaign.name}
                      </div>
                      <div
                        style={{
                          color: 'rgba(255,255,255,0.35)',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {campaign.category && (
                          <span
                            style={{
                              background: 'rgba(147,51,234,0.15)',
                              color: 'rgba(147,51,234,0.8)',
                              padding: '1px 6px',
                              borderRadius: '20px',
                              fontSize: '10px',
                            }}
                          >
                            {campaign.category}
                          </span>
                        )}
                        {campaign.budget && (
                          <span>{Number(campaign.budget).toLocaleString()} AMD</span>
                        )}
                      </div>
                    </div>
                    <i
                      className="ti ti-chevron-right"
                      style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}
                    />
                  </div>
                ))}

                {campaigns.length > 2 && (
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: '11px',
                      textAlign: 'center',
                      marginTop: '4px',
                    }}
                  >
                    +{campaigns.length - 2} ещё
                  </p>
                )}
              </div>
            )}

            {friendshipStatus === 'friends' && (
              <div style={{ marginTop: '16px', textAlign: 'center', color: '#4ade80', fontSize: '13px' }}>
                ✓ Вы друзья
              </div>
            )}

            {friendshipStatus === 'sent' && (
              <div
                style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '13px',
                }}
              >
                ⏳ Заявка отправлена
              </div>
            )}

            {friendshipStatus === 'received' && (
              <div
                style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '13px',
                }}
              >
                📩 Входящая заявка в друзья
              </div>
            )}

            {friendshipStatus === 'none' && (
              <button
                type="button"
                onClick={async () => {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser()
                  if (!user) return
                  await supabase.from('friendships').insert({
                    requester_id: user.id,
                    addressee_id: profileId,
                    status: 'pending',
                  })
                  setFriendshipStatus('sent')
                }}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--accent-primary, #9333ea)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <i className="ti ti-user-plus" style={{ fontSize: '16px' }} />
                Добавить в друзья
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
