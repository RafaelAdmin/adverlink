'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Role = 'creator' | 'advertiser'

type DashboardContextValue = {
  role: Role
  toggleRole: () => void
  user: any
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    throw new Error('useDashboard must be used within DashboardLayout')
  }
  return ctx
}

function SidebarItem({
  icon,
  label,
  href,
  active,
}: {
  icon: string
  label: string
  href: string
  active?: boolean
}) {
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<Role>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('adverlink_role') as Role) || 'advertiser'
    }
    return 'advertiser'
  })
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
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
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex items-center justify-center">
        <div className="text-white/50">Загрузка...</div>
      </div>
    )
  }

  const isActive = (path: string) => pathname === path
  const isStandalonePage = pathname?.startsWith('/dashboard/channel/')

  if (isStandalonePage) {
    return (
      <DashboardContext.Provider value={{ role, toggleRole, user }}>
        {children}
      </DashboardContext.Provider>
    )
  }

  return (
    <DashboardContext.Provider value={{ role, toggleRole, user }}>
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#1a1560] to-[#24243e] flex">
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
            <input
              placeholder="Поиск..."
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/30 outline-none focus:border-purple-500 transition w-64 text-sm"
            />
            <div className="flex items-center gap-4">
              <button
                onClick={toggleRole}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white hover:border-purple-500 transition"
              >
                <span>{role === 'creator' ? '🎨 Создатель' : '📢 Рекламодатель'}</span>
                <span className="text-white/40">↔</span>
              </button>
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
