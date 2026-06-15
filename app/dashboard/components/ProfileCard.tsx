'use client'

/*
If saving still doesn't work, run this in Supabase SQL Editor:
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);
*/

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useDashboard } from '../layout'

interface ProfileCardProps {
  user: any
  role: 'creator' | 'advertiser'
  onClose: () => void
  onAvatarUpdate?: () => void
}

export default function ProfileCard({ user, role, onClose }: ProfileCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const { avatarUrl: contextAvatarUrl } = useDashboard()
  const cardRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<any[]>([])
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([])
  const [reviews, setReviews] = useState<{ rating: number }[]>([])

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [description, setDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [subscriptionPlan, setSubscriptionPlan] = useState('free')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isFounder, setIsFounder] = useState(false)

  const displayAvatar = avatarUrl || contextAvatarUrl

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
      : 0

  const loadProfile = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profile) {
      setFullName(profile.full_name || '')
      setUsername(profile.username || '')
      setDescription(profile.description || '')
      setAvatarUrl(profile.avatar_url || '')
      setSubscriptionPlan(profile.subscription_plan || 'free')
      setIsAdmin(profile.is_admin || false)
      setIsFounder(profile.is_founder || false)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const fetchExtras = async () => {
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', user.id)

      setReviews(reviewsData || [])

      if (role === 'creator') {
        const { data: channelsData } = await supabase
          .from('channels')
          .select('*')
          .eq('owner_id', user.id)

        setChannels(channelsData || [])
        setActiveCampaigns([])
      } else {
        const { data: campaignsData } = await supabase
          .from('campaigns')
          .select('*')
          .eq('advertiser_id', user.id)
          .eq('status', 'active')

        setActiveCampaigns(campaignsData || [])
        setChannels([])
      }
    }

    fetchExtras()
  }, [user.id, role])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    const onProfileUpdate = () => loadProfile()
    const onAvatarUpdate = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name, username, description')
        .eq('id', user.id)
        .single()
      if (profile) {
        setAvatarUrl(profile.avatar_url || '')
        setFullName(profile.full_name || '')
        setUsername(profile.username || '')
        setDescription(profile.description || '')
      }
    }
    window.addEventListener('adverlink-profile-updated', onProfileUpdate)
    window.addEventListener('adverlink-avatar-updated', onAvatarUpdate)
    return () => {
      window.removeEventListener('adverlink-profile-updated', onProfileUpdate)
      window.removeEventListener('adverlink-avatar-updated', onAvatarUpdate)
    }
  }, [user.id])

  const displayName = fullName || user.email?.split('@')[0] || 'Пользователь'
  const displayUsername = username ? `@${username}` : `@${user.id.slice(0, 8)}`

  return (
    <div
      ref={cardRef}
      className="fixed top-16 right-4 z-50 w-80 p-5"
      style={{
        background: 'rgba(15, 12, 41, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'slideDown 0.2s ease-out',
      }}
    >
      {loading ? (
        <div className="text-white/50 text-sm text-center py-8">Загрузка...</div>
      ) : (
        <>
          {/* Top section */}
          <div className="pb-4 border-b border-white/10 relative">
            {isAdmin ? (
              <span
                className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(220, 38, 38, 0.2)',
                  border: '1px solid rgba(220, 38, 38, 0.4)',
                  color: '#f87171',
                  boxShadow: '0 0 12px rgba(220, 38, 38, 0.3)',
                  zIndex: 20,
                }}
              >
                🛡️ ADMIN
              </span>
            ) : subscriptionPlan === 'pro' ? (
              <span
                className="absolute top-4 right-4 flex items-center gap-1 text-white text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                👑 PRO
              </span>
            ) : (
              <span className="absolute top-4 right-4 text-white/30 text-xs px-3 py-1 rounded-full border border-white/10">
                FREE
              </span>
            )}

            <div className="relative mx-auto w-20 h-20 mt-4 mb-1">
              <div
                style={
                  isAdmin
                    ? {
                        borderRadius: '50%',
                        padding: '2px',
                        background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                        boxShadow: '0 0 20px rgba(220,38,38,0.4)',
                      }
                    : {}
                }
              >
                <div
                  style={
                    isAdmin
                      ? {
                          boxShadow: '0 0 0 2px rgba(220,38,38,0.5), 0 0 20px rgba(220,38,38,0.3)',
                          borderRadius: '50%',
                        }
                      : {}
                  }
                >
                  {displayAvatar ? (
                    <img
                      src={displayAvatar + '?t=' + new Date().getMinutes()}
                      alt="avatar"
                      className="w-20 h-20 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      display: displayAvatar ? 'none' : 'flex',
                    }}
                  >
                    {user.email?.[0].toUpperCase()}
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div
                  className="absolute"
                  title="Администратор"
                  style={{
                    top: '-8px',
                    right: '-12px',
                    fontSize: '22px',
                    transform: 'rotate(25deg)',
                    filter: 'drop-shadow(0 0 8px rgba(255, 200, 0, 0.9))',
                    animation: 'crownFloat 2s ease-in-out infinite',
                    transformOrigin: 'center center',
                    zIndex: 10,
                  }}
                >
                  👑
                </div>
              )}
            </div>

            <div className="text-white text-xl font-bold text-center mt-2">{displayName}</div>
            <div className="text-white/40 text-sm text-center">{displayUsername}</div>
            <div className="text-white/30 text-xs text-center mt-1">{user.email}</div>
            {isAdmin && (
              <p className="text-red-400/70 text-xs text-center mt-1 flex items-center justify-center gap-1">
                <span>🛡️</span>
                <span>Администратор платформы</span>
              </p>
            )}
            {isFounder && !isAdmin && (
              <p className="text-yellow-400/70 text-xs text-center mt-1">Основатель</p>
            )}
          </div>

          {/* Rating row */}
          <div className="py-4 border-b border-white/10 flex justify-center items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-lg">★</span>
              <span className="text-white font-bold text-lg">{avgRating.toFixed(1)}</span>
              <span className="text-white/40 text-sm">{reviews.length} отзывов</span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            {role === 'creator' ? (
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">{channels.length}</span>
                <span className="text-white/40 text-sm">каналов</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">{activeCampaigns.length}</span>
                <span className="text-white/40 text-sm">кампаний</span>
              </div>
            )}
          </div>

          {/* Channels list */}
          {role === 'creator' && channels.length > 0 && (
            <div className="py-4 border-b border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                  Мои каналы
                </span>
                <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">
                  {channels.length}
                </span>
              </div>

              {channels.slice(0, 3).map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center gap-3 py-2.5 border border-white/5 rounded-xl px-3 mb-2 hover:border-white/15 transition cursor-pointer"
                  onClick={() => {
                    router.push('/dashboard')
                    onClose()
                  }}
                >
                  <div className="w-[30px] h-[30px] rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {channel.avatar_url ? (
                      <img
                        src={channel.avatar_url}
                        alt={channel.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                      >
                        {channel.name?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{channel.name}</div>
                    <div className="text-white/40 text-xs">
                      {channel.subscriber_count >= 1000
                        ? Math.round(channel.subscriber_count / 1000) + 'K'
                        : channel.subscriber_count}{' '}
                      подписчиков
                    </div>
                  </div>
                  <span className="text-white/30 text-sm">→</span>
                </div>
              ))}
            </div>
          )}

          {/* Active campaigns list */}
          {role === 'advertiser' && activeCampaigns.length > 0 && (
            <div className="py-4 border-b border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/40 text-xs font-medium uppercase tracking-wider">
                  Активные кампании
                </span>
                <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full">
                  {activeCampaigns.length}
                </span>
              </div>

              {activeCampaigns.slice(0, 2).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center gap-3 py-2.5 border border-white/5 rounded-xl px-3 mb-2"
                >
                  <div className="w-[30px] h-[30px] rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0">
                    📋
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{campaign.name}</div>
                    <div className="text-white/40 text-xs">
                      {Number(campaign.budget || 0).toLocaleString()} AMD
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="py-4 border-b border-white/10">
            <div className="text-white/40 text-xs uppercase tracking-wider mb-2">О себе</div>
            <p className="text-white/60 text-sm leading-relaxed">
              {description || 'Добавьте описание на странице профиля'}
            </p>
          </div>

          {/* Bottom button */}
          <button
            type="button"
            onClick={() => {
              router.push('/dashboard/profile')
              onClose()
            }}
            className="w-full py-3 rounded-xl font-medium text-white text-sm mt-2 transition hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Редактировать профиль
          </button>
        </>
      )}
    </div>
  )
}
