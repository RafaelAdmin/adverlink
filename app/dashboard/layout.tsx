'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { applyAccentColor, getAccentColor } from '@/lib/theme'
import ProfileCard from './components/ProfileCard'
import BreathingBackground from './components/BreathingBackground'

type Role = 'creator' | 'advertiser'

type DashboardContextValue = {
  role: Role
  toggleRole: () => void
  user: any
  search: string
  avatarUrl: string | null
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardLayout')
  return ctx
}

function SidebarItem({
  icon,
  label,
  href,
  active,
  badge,
}: {
  icon: string
  label: string
  href: string
  active?: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 w-full group ${
        active ? 'text-white' : 'text-white/50 hover:text-white'
      }`}
      style={
        active
          ? {
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            }
          : {
              background: 'transparent',
              border: '1px solid transparent',
            }
      }
    >
      <i
        className={`ti ${icon}`}
        style={{
          fontSize: '18px',
          color: active ? 'var(--accent-primary, #9333ea)' : 'rgba(255,255,255,0.4)',
          transition: 'color 0.2s',
        }}
      />
      <span style={{ flex: 1, fontWeight: active ? '500' : '400' }}>{label}</span>
      {badge && badge > 0 ? (
        <span
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            fontSize: '10px',
            fontWeight: '700',
            padding: '2px 6px',
            borderRadius: '10px',
            minWidth: '18px',
            textAlign: 'center',
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : active ? (
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
        />
      ) : null}
    </Link>
  )
}

function RoleToggle({ role, onToggle }: { role: Role; onToggle: () => void }) {
  const isCreator = role === 'creator'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          title="Рекламодатель"
          style={{
            display: 'flex',
            alignItems: 'center',
            color: !isCreator ? 'white' : 'rgba(255,255,255,0.35)',
            transition: 'color 0.2s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a3 3 0 0 1 0 6" />
            <path d="M10 8v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-5" />
            <path d="M12 8H5l-2 4l2 4h14l2-4l-2-4z" />
          </svg>
        </div>

        <button
          onClick={onToggle}
          className="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none"
          style={{ background: isCreator ? 'var(--accent-primary, #9333ea)' : 'rgba(255,255,255,0.15)' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300"
            style={{ transform: isCreator ? 'translateX(24px)' : 'translateX(0)' }}
          />
        </button>

        <div
          title="Создатель"
          style={{
            display: 'flex',
            alignItems: 'center',
            color: isCreator ? 'white' : 'rgba(255,255,255,0.35)',
            transition: 'color 0.2s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21a9 9 0 0 1 0-18c4.97 0 9 3.582 9 8c0 1.06-.474 2.078-1.318 2.828-.844.75-1.989 1.172-3.182 1.172h-2.5a2 2 0 0 0-1 3.75a1.3 1.3 0 0 1-1 2.25" />
            <path d="M7.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0" />
            <path d="M11.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0" />
            <path d="M15.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0" />
          </svg>
        </div>
      </div>

      <span
        style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '11px',
          fontWeight: '500',
          whiteSpace: 'nowrap',
        }}
      >
        {isCreator ? 'Режим создателя' : 'Режим рекламодателя'}
      </span>
    </div>
  )
}

function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ channels: any[]; pages: any[]; users: any[] }>({
    channels: [],
    pages: [],
    users: [],
  })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [showUserCard, setShowUserCard] = useState<any>(null)
  const [userCardStats, setUserCardStats] = useState({ channels: 0, campaigns: 0, reviews: 0 })
  const router = useRouter()
  const supabase = createClient()
  const ref = useRef<HTMLDivElement>(null)

  const pages = [
    { label: 'Мои каналы', href: '/dashboard', icon: '📺', keywords: 'каналы мои добавить канал' },
    { label: 'Маркетплейс', href: '/dashboard/marketplace', icon: '🛒', keywords: 'маркетплейс каталог реклама поиск' },
    { label: 'Статистика', href: '/dashboard/statistics', icon: '📊', keywords: 'статистика аналитика доход просмотры' },
    { label: 'Отзывы', href: '/dashboard/reviews', icon: '⭐', keywords: 'отзывы рейтинг оценка' },
    { label: 'Друзья', href: '/dashboard/friends', icon: '👥', keywords: 'друзья заявки пользователи' },
    { label: 'Настройки', href: '/dashboard/settings', icon: '⚙️', keywords: 'настройки кастомизация цвет тема профиль пароль аккаунт' },
    { label: 'Подписки', href: '/dashboard/subscriptions', icon: '💎', keywords: 'подписки тарифы цены про премиум план' },
    { label: 'Профиль', href: '/dashboard/profile', icon: '👤', keywords: 'профиль имя email аватар аккаунт' },
    { label: 'Добавить канал', href: '/dashboard/add-channel', icon: '➕', keywords: 'добавить канал новый telegram' },
    { label: 'Админ панель', href: '/admin', icon: '🛡️', keywords: 'админ панель модерация пользователи' },
  ]

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!showUserCard) return
    const loadStats = async () => {
      const [{ count: ch }, { count: camp }, { count: rev }] = await Promise.all([
        supabase.from('channels').select('*', { count: 'exact', head: true }).eq('owner_id', showUserCard.id),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('advertiser_id', showUserCard.id),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('reviewee_id', showUserCard.id),
      ])
      setUserCardStats({
        channels: ch || 0,
        campaigns: camp || 0,
        reviews: rev || 0,
      })
    }
    loadStats()
  }, [showUserCard])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults({ channels: [], pages: [], users: [] })
      setOpen(false)
      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)
      setOpen(true)

      const [{ data: channels }, { data: users }] = await Promise.all([
        supabase
          .from('channels')
          .select('id, name, telegram_username, avatar_url, subscriber_count')
          .ilike('name', `%${query}%`)
          .limit(5),
        currentUserId
          ? supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url, description')
              .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
              .neq('id', currentUserId)
              .limit(3)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const filteredPages = pages.filter(
        (p) =>
          p.label.toLowerCase().includes(query.toLowerCase()) ||
          p.keywords.toLowerCase().includes(query.toLowerCase()),
      )

      setResults({ channels: channels || [], pages: filteredPages, users: users || [] })
      setLoading(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, currentUserId])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          placeholder="Поиск..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 pl-9 text-white placeholder-white/30 outline-none focus-accent transition w-72 text-sm"
        />
        <span className="absolute left-3 top-2.5 text-white/30 text-sm">🔍</span>
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-3 top-2.5 text-white/30 hover:text-white transition text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-12 left-0 w-96 bg-[#1a1560] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {loading ? (
            <div className="p-4 text-white/50 text-sm text-center">Поиск...</div>
          ) : (
            <>
              {results.channels.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-white/30 text-xs font-medium border-b border-white/5">
                    Каналы
                  </div>
                  {results.channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        router.push(`/dashboard/channel/${ch.id}`)
                        setOpen(false)
                        setQuery('')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
                    >
                      {ch.avatar_url ? (
                        <img src={ch.avatar_url} alt={ch.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full avatar-accent-fallback flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {ch.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{ch.name}</div>
                        <div className="text-white/40 text-xs">@{ch.telegram_username}</div>
                      </div>
                      <div className="text-white/40 text-xs">
                        {ch.subscriber_count >= 1000 ? `${(ch.subscriber_count / 1000).toFixed(1)}K` : ch.subscriber_count}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.pages.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-white/30 text-xs font-medium border-b border-white/5">
                    Страницы
                  </div>
                  {results.pages.map((page) => (
                    <button
                      key={page.href}
                      onClick={() => {
                        router.push(page.href)
                        setOpen(false)
                        setQuery('')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
                    >
                      <span className="text-lg">{page.icon}</span>
                      <span className="text-white text-sm">{page.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.users?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-white/30 text-xs font-medium border-b border-white/5">
                    Пользователи
                  </div>
                  {results.users.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setShowUserCard(profile)
                        setOpen(false)
                        setQuery('')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url + '?t=' + Date.now()}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{
                          backgroundColor: 'var(--accent-primary, #9333ea)',
                          display: profile.avatar_url ? 'none' : 'flex',
                        }}
                      >
                        {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {profile.full_name || 'Пользователь'}
                        </div>
                        {profile.username && (
                          <div className="text-white/40 text-xs">@{profile.username}</div>
                        )}
                      </div>
                      <i className="ti ti-user ml-auto text-white/20" style={{ fontSize: '14px' }} />
                    </button>
                  ))}
                </div>
              )}

              {results.channels.length === 0 &&
                results.pages.length === 0 &&
                (results.users?.length || 0) === 0 && (
                <div className="p-6 text-center">
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="text-white/50 text-sm">Ничего не найдено</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showUserCard && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
            onClick={() => setShowUserCard(null)}
          />
          <div
            style={{
              background: 'rgba(15,12,41,0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px',
              width: '320px',
              padding: '24px',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100,
            }}
          >
            <button
              type="button"
              onClick={() => setShowUserCard(null)}
              className="absolute top-3 right-3 text-white/40 hover:text-white text-lg"
            >
              ×
            </button>
            <div className="flex flex-col items-center text-center">
              {showUserCard.avatar_url ? (
                <img
                  src={showUserCard.avatar_url + '?t=' + Date.now()}
                  alt={showUserCard.full_name || 'User'}
                  className="w-16 h-16 rounded-full object-cover mb-3"
                  style={{ border: '2px solid rgba(255,255,255,0.1)' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              ) : null}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3"
                style={{
                  backgroundColor: 'var(--accent-primary, #9333ea)',
                  display: showUserCard.avatar_url ? 'none' : 'flex',
                  border: '2px solid rgba(255,255,255,0.1)',
                }}
              >
                {(showUserCard.full_name || showUserCard.username || 'U')[0].toUpperCase()}
              </div>
              <div className="text-white font-bold text-lg">
                {showUserCard.full_name || 'Пользователь'}
              </div>
              {showUserCard.username && (
                <div className="text-white/40 text-sm">@{showUserCard.username}</div>
              )}
              {showUserCard.description && (
                <p className="text-white/50 text-xs mt-2 leading-relaxed">{showUserCard.description}</p>
              )}
              <div className="flex gap-4 mt-4 text-white/40 text-xs">
                <span>{userCardStats.channels} каналов</span>
                <span>{userCardStats.campaigns} кампаний</span>
                <span>{userCardStats.reviews} отзывов</span>
              </div>
              <div className="flex flex-col gap-2 w-full mt-5">
                <button
                  type="button"
                  onClick={async () => {
                    if (!currentUserId) return
                    await supabase.from('friendships').insert({
                      requester_id: currentUserId,
                      addressee_id: showUserCard.id,
                      status: 'pending',
                    })
                    setShowUserCard(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 text-white rounded-full px-4 py-2 text-sm"
                  style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
                >
                  <i className="ti ti-user-plus" style={{ fontSize: '14px' }} />
                  Добавить в друзья
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (showUserCard.username) {
                      router.push(`/u/${showUserCard.username}`)
                    }
                    setShowUserCard(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-white/20 text-white rounded-full px-4 py-2 text-sm"
                >
                  <i className="ti ti-external-link" style={{ fontSize: '14px' }} />
                  Перейти в профиль
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!currentUserId || !window.confirm('Заблокировать этого пользователя?')) return
                    await supabase.from('blocked_users').insert({
                      blocker_id: currentUserId,
                      blocked_id: showUserCard.id,
                    })
                    setShowUserCard(null)
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-3 py-1.5 text-xs"
                >
                  <i className="ti ti-ban" style={{ fontSize: '12px' }} />
                  Заблокировать
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('adverlink_role') as Role) || 'advertiser'
    }
    return 'advertiser'
  })
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [currentGradient, setCurrentGradient] = useState(
    'linear-gradient(135deg, #0f0c29 0%, #1a1560 50%, #24243e 100%)',
  )
  const [showProfileCard, setShowProfileCard] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [pendingReviewCount, setPendingReviewCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  const refreshAvatar = useCallback(async () => {
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
  }, [user, supabase])

  useEffect(() => {
    const color = getAccentColor(role)
    applyAccentColor(color)
    setCurrentGradient(color.gradientRaw)
  }, [role])

  useEffect(() => {
    const onThemeChange = () => {
      const color = getAccentColor(role)
      applyAccentColor(color)
      setCurrentGradient(color.gradientRaw)
    }
    window.addEventListener('adverlink-theme-change', onThemeChange)
    window.addEventListener('adverlink-accent-change', onThemeChange)
    return () => {
      window.removeEventListener('adverlink-theme-change', onThemeChange)
      window.removeEventListener('adverlink-accent-change', onThemeChange)
    }
  }, [role])

  useEffect(() => {
    const onAvatarUpdate = () => refreshAvatar()
    window.addEventListener('adverlink-avatar-updated', onAvatarUpdate)
    return () => window.removeEventListener('adverlink-avatar-updated', onAvatarUpdate)
  }, [user, refreshAvatar])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const color = getAccentColor(role)
      applyAccentColor(color)
      setCurrentGradient(color.gradientRaw)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile?.is_admin) setIsAdmin(true)
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)

      const { data: userChannels } = await supabase
        .from('channels')
        .select('id')
        .eq('owner_id', user.id)
      const channelIds = (userChannels || []).map((c) => c.id)

      if (channelIds.length > 0) {
        const { count: newCount } = await supabase
          .from('ad_requests')
          .select('*', { count: 'exact', head: true })
          .in('channel_id', channelIds)
          .eq('status', 'new')
        setNewRequestsCount(newCount || 0)
      } else {
        setNewRequestsCount(0)
      }

      const { count: pendingCount } = await supabase
        .from('ad_requests')
        .select('*', { count: 'exact', head: true })
        .eq('advertiser_id', user.id)
        .eq('status', 'submitted')
      setPendingReviewCount(pendingCount || 0)

      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .neq('sender_id', user.id)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      setUnreadMessages(unreadCount || 0)
    }
    getUser()
  }, [])

  const toggleRole = () => {
    const newRole = role === 'creator' ? 'advertiser' : 'creator'
    setRole(newRole)
    localStorage.setItem('adverlink_role', newRole)
    const color = getAccentColor(newRole)
    applyAccentColor(color)
    setCurrentGradient(color.gradientRaw)
  }

  if (!user) {
    return (
      <BreathingBackground
        gradient={currentGradient}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-white/50">Загрузка...</div>
      </BreathingBackground>
    )
  }

  const isActive = (path: string) => pathname === path
  const isStandalonePage = pathname?.startsWith('/dashboard/channel/')

  if (isStandalonePage) {
    return (
      <DashboardContext.Provider value={{ role, toggleRole, user, search, avatarUrl }}>
        <BreathingBackground gradient={currentGradient}>
          {children}
        </BreathingBackground>
      </DashboardContext.Provider>
    )
  }

  return (
    <DashboardContext.Provider value={{ role, toggleRole, user, search, avatarUrl }}>
      <BreathingBackground gradient={currentGradient} lockViewport className="flex h-full">
        <aside
          className="w-64 shrink-0 h-full flex flex-col gap-1 p-4 overflow-y-auto"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 mb-4 shrink-0">
            <span className="text-white text-2xl font-bold tracking-tight">
              Adver<span style={{ color: 'var(--accent-primary, #9333ea)' }}>Link</span>
            </span>
          </Link>

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 4px 8px' }} />

          {role === 'creator' ? (
            <>
              <SidebarItem icon="ti-brand-telegram" label="Мои каналы" href="/dashboard" active={isActive('/dashboard')} />
              <SidebarItem icon="ti-shopping-bag" label="Маркетплейс" href="/dashboard/marketplace" active={isActive('/dashboard/marketplace')} badge={newRequestsCount + unreadMessages} />
              <SidebarItem icon="ti-chart-line" label="Статистика" href="/dashboard/statistics" active={isActive('/dashboard/statistics')} />
              <SidebarItem icon="ti-star" label="Отзывы" href="/dashboard/reviews" active={isActive('/dashboard/reviews')} />
              <SidebarItem icon="ti-users" label="Друзья" href="/dashboard/friends" active={isActive('/dashboard/friends')} />
              <SidebarItem icon="ti-diamond" label="Подписки" href="/dashboard/subscriptions" active={isActive('/dashboard/subscriptions')} />
              <SidebarItem icon="ti-settings" label="Настройки" href="/dashboard/settings" active={isActive('/dashboard/settings')} />
            </>
          ) : (
            <>
              <SidebarItem icon="ti-layout-dashboard" label="Мои кампании" href="/dashboard" active={isActive('/dashboard')} />
              <SidebarItem icon="ti-shopping-bag" label="Маркетплейс" href="/dashboard/marketplace" active={isActive('/dashboard/marketplace')} badge={pendingReviewCount + unreadMessages} />
              <SidebarItem icon="ti-chart-line" label="Статистика" href="/dashboard/statistics" active={isActive('/dashboard/statistics')} />
              <SidebarItem icon="ti-star" label="Отзывы" href="/dashboard/reviews" active={isActive('/dashboard/reviews')} />
              <SidebarItem icon="ti-users" label="Друзья" href="/dashboard/friends" active={isActive('/dashboard/friends')} />
              <SidebarItem icon="ti-diamond" label="Подписки" href="/dashboard/subscriptions" active={isActive('/dashboard/subscriptions')} />
              <SidebarItem icon="ti-settings" label="Настройки" href="/dashboard/settings" active={isActive('/dashboard/settings')} />
            </>
          )}

          <div className="flex-1" />

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 4px' }} />

          <div
            role="button"
            tabIndex={0}
            className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onClick={() => router.push('/dashboard/profile')}
            onKeyDown={(e) => e.key === 'Enter' && router.push('/dashboard/profile')}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 overflow-hidden"
              style={!avatarUrl ? { backgroundColor: 'var(--accent-primary, #9333ea)' } : undefined}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                user.email?.[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">
                {user.email?.split('@')[0]}
              </div>
              <div className="text-white/30 text-xs truncate">{user.email}</div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.2)' }} />
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-0 min-w-0 h-full">
          <header
            className="shrink-0 flex items-center justify-between px-6 py-3 z-20"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="relative">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-5">
              <RoleToggle role={role} onToggle={toggleRole} />

              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition"
                  style={{
                    background: 'rgba(220,38,38,0.15)',
                    border: '1px solid rgba(220,38,38,0.3)',
                    color: '#f87171',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <i className="ti ti-shield" style={{ fontSize: '14px' }} />
                  <span className="text-xs font-medium">Админ</span>
                </Link>
              )}

              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setShowProfileCard((v) => !v)}
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-medium hover:opacity-80 transition relative flex-shrink-0"
                style={!avatarUrl ? { backgroundColor: 'var(--accent-primary, #9333ea)' } : {}}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  user.email?.[0].toUpperCase()
                )}
              </button>
            </div>
          </header>

          {showProfileCard && (
            <ProfileCard
              user={user}
              role={role}
              onClose={() => setShowProfileCard(false)}
              onAvatarUpdate={refreshAvatar}
            />
          )}

          <main className="flex-1 min-h-0 overflow-y-auto p-8">{children}</main>
        </div>
      </BreathingBackground>
    </DashboardContext.Provider>
  )
}