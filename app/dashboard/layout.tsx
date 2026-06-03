'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { advertiserThemes, getTheme } from '@/lib/theme'

type Role = 'creator' | 'advertiser'

type DashboardContextValue = {
  role: Role
  toggleRole: () => void
  user: any
  search: string
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardLayout')
  return ctx
}

function SidebarItem({ icon, label, href, active }: { icon: string; label: string; href: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition w-full ${
        active ? 'bg-purple-600 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function RoleToggle({ role, onToggle }: { role: Role; onToggle: () => void }) {
  const isCreator = role === 'creator'
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium transition ${!isCreator ? 'text-white' : 'text-white/40'}`}>
        Рекламодатель
      </span>
      <button
        onClick={onToggle}
        className="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none"
        style={{ background: isCreator ? '#9333ea' : 'rgba(255,255,255,0.15)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300"
          style={{ transform: isCreator ? 'translateX(24px)' : 'translateX(0)' }}
        />
      </button>
      <span className={`text-xs font-medium transition ${isCreator ? 'text-white' : 'text-white/40'}`}>
        Создатель
      </span>
    </div>
  )
}

function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ channels: any[]; pages: any[] }>({ channels: [], pages: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const ref = useRef<HTMLDivElement>(null)

  const pages = [
    { label: 'Мои каналы', href: '/dashboard', icon: '📺', keywords: 'каналы мои добавить канал' },
    { label: 'Маркетплейс', href: '/dashboard/marketplace', icon: '🛒', keywords: 'маркетплейс каталог реклама поиск' },
    { label: 'Статистика', href: '/dashboard/statistics', icon: '📊', keywords: 'статистика аналитика доход просмотры' },
    { label: 'Отзывы', href: '/dashboard/reviews', icon: '⭐', keywords: 'отзывы рейтинг оценка' },
    { label: 'Настройки', href: '/dashboard/settings', icon: '⚙️', keywords: 'настройки кастомизация цвет тема профиль пароль аккаунт' },
    { label: 'Подписки', href: '/pricing', icon: '💎', keywords: 'подписки тарифы цены про премиум план' },
    { label: 'Профиль', href: '/dashboard/profile', icon: '👤', keywords: 'профиль имя email аватар аккаунт' },
    { label: 'Добавить канал', href: '/dashboard/add-channel', icon: '➕', keywords: 'добавить канал новый telegram' },
    { label: 'Админ панель', href: '/admin', icon: '🛡️', keywords: 'админ панель модерация пользователи' },
  ]

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
      setResults({ channels: [], pages: [] })
      setOpen(false)
      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)
      setOpen(true)

      const { data: channels } = await supabase
        .from('channels')
        .select('id, name, telegram_username, avatar_url, subscriber_count')
        .ilike('name', `%${query}%`)
        .limit(5)

        const filteredPages = pages.filter(p =>
          p.label.toLowerCase().includes(query.toLowerCase()) ||
          p.keywords.toLowerCase().includes(query.toLowerCase())
        )

      setResults({ channels: channels || [], pages: filteredPages })
      setLoading(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          placeholder="Поиск..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 pl-9 text-white placeholder-white/30 outline-none focus:border-purple-500 transition w-72 text-sm"
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
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
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

              {results.channels.length === 0 && results.pages.length === 0 && (
                <div className="p-6 text-center">
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="text-white/50 text-sm">Ничего не найдено</div>
                </div>
              )}
            </>
          )}
        </div>
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
  const [theme, setTheme] = useState(advertiserThemes[0])

  useEffect(() => {
    const currentTheme = getTheme(role)
    setTheme(currentTheme)
    document.documentElement.style.setProperty('--accent', currentTheme.accent)
  }, [role])

  useEffect(() => {
    const onThemeChange = () => {
      const currentTheme = getTheme(role)
      setTheme(currentTheme)
      document.documentElement.style.setProperty('--accent', currentTheme.accent)
    }
    window.addEventListener('adverlink-theme-change', onThemeChange)
    return () => window.removeEventListener('adverlink-theme-change', onThemeChange)
  }, [role])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (profile?.is_admin) setIsAdmin(true)
    }
    getUser()
  }, [])

  const toggleRole = () => {
    const newRole = role === 'creator' ? 'advertiser' : 'creator'
    setRole(newRole)
    localStorage.setItem('adverlink_role', newRole)
  }

  if (!user) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
        <div className="text-white/50">Загрузка...</div>
      </div>
    )
  }

  const isActive = (path: string) => pathname === path
  const isStandalonePage = pathname?.startsWith('/dashboard/channel/')

  if (isStandalonePage) {
    return (
      <DashboardContext.Provider value={{ role, toggleRole, user, search }}>
        {children}
      </DashboardContext.Provider>
    )
  }

  return (
    <DashboardContext.Provider value={{ role, toggleRole, user, search }}>
      <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} flex`}>
        <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-2">
          <Link href="/dashboard" className="text-white text-xl font-bold mb-8 block">
            Adver<span className="text-purple-400">Link</span>
          </Link>
          {role === 'creator' ? (
            <>
              <SidebarItem icon="📺" label="Мои каналы" href="/dashboard" active={isActive('/dashboard')} />
              <SidebarItem icon="🛒" label="Маркетплейс" href="/dashboard/marketplace" active={isActive('/dashboard/marketplace')} />
              <SidebarItem icon="📊" label="Статистика" href="/dashboard/statistics" active={isActive('/dashboard/statistics')} />
              <SidebarItem icon="⭐" label="Отзывы" href="/dashboard/reviews" active={isActive('/dashboard/reviews')} />
              <SidebarItem icon="⚙️" label="Настройки" href="/dashboard/settings" active={isActive('/dashboard/settings')} />
            </>
          ) : (
            <>
              <SidebarItem icon="📋" label="Мои кампании" href="/dashboard" active={isActive('/dashboard')} />
              <SidebarItem icon="🛒" label="Маркетплейс" href="/dashboard/marketplace" active={isActive('/dashboard/marketplace')} />
              <SidebarItem icon="📊" label="Статистика" href="/dashboard/statistics" active={isActive('/dashboard/statistics')} />
              <SidebarItem icon="⭐" label="Отзывы" href="/dashboard/reviews" active={isActive('/dashboard/reviews')} />
              <SidebarItem icon="⚙️" label="Настройки" href="/dashboard/settings" active={isActive('/dashboard/settings')} />
            </>
          )}
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
            <GlobalSearch />
            <div className="flex items-center gap-6">
              <RoleToggle role={role} onToggle={toggleRole} />
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 bg-white/5 border border-white/10 hover:border-purple-500 text-white/70 hover:text-white rounded-full px-3 py-2 text-sm transition"
                >
                  🛡️ Админ
                </Link>
              )}
              <Link
                href="/dashboard/profile"
                className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium hover:bg-purple-500 transition"
              >
                {user.email?.[0].toUpperCase()}
              </Link>
            </div>
          </header>

          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </DashboardContext.Provider>
  )
}