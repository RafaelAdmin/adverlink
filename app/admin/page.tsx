/*
Run in Supabase SQL Editor for admin access:

create policy "Admins can do everything on channels"
on channels for all
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

create policy "Admins can do everything on ad_requests"
on ad_requests for all
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

create policy "Admins can do everything on campaigns"
on campaigns for all
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

create policy "Admins can do everything on reviews"
on reviews for all
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

create policy "Admins can view all profiles"
on profiles for select
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

create policy "Admins can update all profiles"
on profiles for update
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

create policy "Admins can delete profiles"
on profiles for delete
using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
*/

'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Section =
  | 'overview'
  | 'users'
  | 'channels'
  | 'campaigns'
  | 'requests'
  | 'reviews'
  | 'moderation'
  | 'platform'

type Toast = { id: number; message: string; type: 'success' | 'error' }

type OverviewStats = {
  users: number
  channels: number
  pendingChannels: number
  campaigns: number
  requests: number
  reviews: number
}

const SIDEBAR_ITEMS: { icon: string; label: string; section: Section }[] = [
  { icon: '📊', label: 'Обзор', section: 'overview' },
  { icon: '👥', label: 'Пользователи', section: 'users' },
  { icon: '📺', label: 'Каналы', section: 'channels' },
  { icon: '📋', label: 'Кампании', section: 'campaigns' },
  { icon: '📨', label: 'Запросы', section: 'requests' },
  { icon: '⭐', label: 'Отзывы', section: 'reviews' },
  { icon: '🛡️', label: 'Модерация', section: 'moderation' },
  { icon: '⚙️', label: 'Настройки платформы', section: 'platform' },
]

function statusBadge(status: string) {
  const map: Record<string, string> = {
    verified: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    rejected: 'bg-red-500/20 text-red-400',
    active: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-purple-500/20 text-purple-400',
    new: 'bg-orange-500/20 text-orange-400',
    replied: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
  }
  return `px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-white/10 text-white/50'}`
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(Math.round(rating))}
      {'☆'.repeat(5 - Math.round(rating))}
    </span>
  )
}

export default function AdminPanel() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [section, setSection] = useState<Section>('overview')
  const [toasts, setToasts] = useState<Toast[]>([])

  const [stats, setStats] = useState<OverviewStats>({
    users: 0,
    channels: 0,
    pendingChannels: 0,
    campaigns: 0,
    requests: 0,
    reviews: 0,
  })
  const [recentRequests, setRecentRequests] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [adRequests, setAdRequests] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [platformStats, setPlatformStats] = useState({
    users: 0,
    verifiedChannels: 0,
    activeCampaigns: 0,
    completedDeals: 0,
    totalRevenue: 0,
  })

  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(0)
  const [channelSearch, setChannelSearch] = useState('')
  const [channelVerificationFilter, setChannelVerificationFilter] = useState('all')
  const [channelActiveFilter, setChannelActiveFilter] = useState('all')
  const [campaignSearch, setCampaignSearch] = useState('')
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all')
  const [requestSearch, setRequestSearch] = useState('')
  const [requestStatusFilter, setRequestStatusFilter] = useState('all')
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null)
  const [expandedReview, setExpandedReview] = useState<string | null>(null)

  const [newCategory, setNewCategory] = useState({ name: '', slug: '', icon: '' })
  const [platformSettings, setPlatformSettings] = useState({
    registrationOpen: true,
    channelVerification: true,
    campaignCreation: true,
  })

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  const loadData = async () => {
    const [
      usersRes,
      channelsRes,
      pendingRes,
      campaignsRes,
      requestsRes,
      reviewsRes,
      recentRes,
      profilesRes,
      allChannelsRes,
      allCampaignsRes,
      allRequestsRes,
      allReviewsRes,
      categoriesRes,
      verifiedRes,
      activeCampRes,
      completedRes,
      revenueRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('channels').select('*', { count: 'exact', head: true }),
      supabase.from('channels').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }),
      supabase.from('ad_requests').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('ad_requests').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('channels').select('*').order('created_at', { ascending: false }),
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('ad_requests').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('channels').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('ad_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('ad_requests').select('budget').eq('status', 'completed'),
    ])

    setStats({
      users: usersRes.count || 0,
      channels: channelsRes.count || 0,
      pendingChannels: pendingRes.count || 0,
      campaigns: campaignsRes.count || 0,
      requests: requestsRes.count || 0,
      reviews: reviewsRes.count || 0,
    })
    setRecentRequests(recentRes.data || [])
    setProfiles(profilesRes.data || [])
    setChannels(allChannelsRes.data || [])
    setCampaigns(allCampaignsRes.data || [])
    setAdRequests(allRequestsRes.data || [])
    setReviews(allReviewsRes.data || [])
    setCategories(categoriesRes.error ? [] : categoriesRes.data || [])

    const revenue = (revenueRes.data || []).reduce((s, r) => s + (Number(r.budget) || 0), 0)
    setPlatformStats({
      users: usersRes.count || 0,
      verifiedChannels: verifiedRes.count || 0,
      activeCampaigns: activeCampRes.count || 0,
      completedDeals: completedRes.count || 0,
      totalRevenue: revenue,
    })
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        setIsAdmin(false)
        setLoading(false)
        setTimeout(() => router.push('/dashboard'), 2000)
        return
      }

      setIsAdmin(true)
      setAdminEmail(user.email || '')
      await loadData()
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    setPlatformSettings({
      registrationOpen: localStorage.getItem('adverlink_reg_open') !== 'false',
      channelVerification: localStorage.getItem('adverlink_verify_channels') !== 'false',
      campaignCreation: localStorage.getItem('adverlink_create_campaigns') !== 'false',
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const deleteRequest = async (id: string, fromRecent = false) => {
    if (!window.confirm('Удалить запрос?')) return
    await supabase.from('ad_requests').delete().eq('id', id)
    setAdRequests((prev) => prev.filter((r) => r.id !== id))
    if (fromRecent) setRecentRequests((prev) => prev.filter((r) => r.id !== id))
    setStats((s) => ({ ...s, requests: Math.max(0, s.requests - 1) }))
    showToast('Запрос удалён')
  }

  const toggleAdmin = async (profile: any) => {
    const newVal = !profile.is_admin
    const msg = newVal
      ? 'Сделать этого пользователя администратором?'
      : 'Снять права администратора?'
    if (!window.confirm(msg)) return
    await supabase.from('profiles').update({ is_admin: newVal }).eq('id', profile.id)
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, is_admin: newVal } : p)))
    showToast(newVal ? 'Пользователь назначен админом' : 'Права админа сняты')
  }

  const deleteUser = async (profile: any) => {
    if (!window.confirm('Удалить пользователя? Все его данные будут удалены.')) return

    const { data: userChannels } = await supabase.from('channels').select('id').eq('owner_id', profile.id)
    const channelIds = (userChannels || []).map((c) => c.id)

    const { data: userCampaigns } = await supabase.from('campaigns').select('id').eq('advertiser_id', profile.id)
    const campaignIds = (userCampaigns || []).map((c) => c.id)

    if (channelIds.length > 0) {
      await supabase.from('ad_requests').delete().in('channel_id', channelIds)
    }
    if (campaignIds.length > 0) {
      await supabase.from('ad_requests').delete().in('campaign_id', campaignIds)
      await supabase.from('campaigns').delete().in('id', campaignIds)
    }
    await supabase.from('channels').delete().eq('owner_id', profile.id)
    await supabase
      .from('reviews')
      .delete()
      .or(`reviewer_id.eq.${profile.id},reviewee_id.eq.${profile.id}`)
    await supabase.from('profiles').delete().eq('id', profile.id)

    setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
    setChannels((prev) => prev.filter((c) => c.owner_id !== profile.id))
    setCampaigns((prev) => prev.filter((c) => c.advertiser_id !== profile.id))
    showToast('Пользователь удалён')
  }

  const verifyChannel = async (id: string) => {
    await supabase.from('channels').update({ verification_status: 'verified', is_verified: true }).eq('id', id)
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === id ? { ...ch, verification_status: 'verified', is_verified: true } : ch,
      ),
    )
    setStats((s) => ({ ...s, pendingChannels: Math.max(0, s.pendingChannels - 1) }))
    showToast('Канал верифицирован')
  }

  const rejectChannel = async (id: string) => {
    await supabase.from('channels').update({ verification_status: 'rejected', is_verified: false }).eq('id', id)
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === id ? { ...ch, verification_status: 'rejected', is_verified: false } : ch,
      ),
    )
    setStats((s) => ({ ...s, pendingChannels: Math.max(0, s.pendingChannels - 1) }))
    showToast('Канал отклонён', 'error')
  }

  const toggleChannelActive = async (channel: any) => {
    const newVal = !channel.is_active
    await supabase.from('channels').update({ is_active: newVal }).eq('id', channel.id)
    setChannels((prev) => prev.map((ch) => (ch.id === channel.id ? { ...ch, is_active: newVal } : ch)))
    showToast(newVal ? 'Канал показан' : 'Канал скрыт')
  }

  const deleteChannel = async (id: string) => {
    if (!window.confirm('Удалить канал навсегда?')) return
    await supabase.from('ad_requests').delete().eq('channel_id', id)
    await supabase.from('channels').delete().eq('id', id)
    setChannels((prev) => prev.filter((ch) => ch.id !== id))
    setStats((s) => ({ ...s, channels: Math.max(0, s.channels - 1) }))
    showToast('Канал удалён')
  }

  const approveCampaign = async (id: string) => {
    await supabase.from('campaigns').update({ status: 'active' }).eq('id', id)
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'active' } : c)))
    showToast('Кампания одобрена')
  }

  const pauseCampaign = async (id: string) => {
    await supabase.from('campaigns').update({ status: 'paused' }).eq('id', id)
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'paused' } : c)))
    showToast('Кампания приостановлена')
  }

  const deleteCampaign = async (id: string) => {
    if (!window.confirm('Удалить кампанию?')) return
    await supabase.from('ad_requests').delete().eq('campaign_id', id)
    await supabase.from('campaigns').delete().eq('id', id)
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    setStats((s) => ({ ...s, campaigns: Math.max(0, s.campaigns - 1) }))
    showToast('Кампания удалена')
  }

  const approveRequest = async (id: string) => {
    await supabase.from('ad_requests').update({ status: 'replied' }).eq('id', id)
    setAdRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'replied' } : r)))
    showToast('Запрос одобрен')
  }

  const deleteReview = async (id: string) => {
    if (!window.confirm('Удалить отзыв?')) return
    await supabase.from('reviews').delete().eq('id', id)
    setReviews((prev) => prev.filter((r) => r.id !== id))
    setStats((s) => ({ ...s, reviews: Math.max(0, s.reviews - 1) }))
    showToast('Отзыв удалён')
  }

  const addCategory = async () => {
    if (!newCategory.name.trim() || !newCategory.slug.trim()) return
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: newCategory.name.trim(),
        slug: newCategory.slug.trim(),
        icon: newCategory.icon.trim() || '📁',
      })
      .select()
      .single()
    if (error) {
      showToast('Ошибка добавления категории', 'error')
      return
    }
    setCategories((prev) => [...prev, data])
    setNewCategory({ name: '', slug: '', icon: '' })
    showToast('Категория добавлена')
  }

  const deleteCategory = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    showToast('Категория удалена')
  }

  const savePlatformSettings = () => {
    localStorage.setItem('adverlink_reg_open', String(platformSettings.registrationOpen))
    localStorage.setItem('adverlink_verify_channels', String(platformSettings.channelVerification))
    localStorage.setItem('adverlink_create_campaigns', String(platformSettings.campaignCreation))
    alert('Настройки сохранены')
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    showToast('ID скопирован')
  }

  const pendingChannels = channels.filter((ch) => ch.verification_status === 'pending')

  const filteredProfiles = profiles.filter(
    (p) =>
      !userSearch ||
      p.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(userSearch.toLowerCase()),
  )
  const USERS_PER_PAGE = 20
  const paginatedProfiles = filteredProfiles.slice(
    userPage * USERS_PER_PAGE,
    (userPage + 1) * USERS_PER_PAGE,
  )
  const totalUserPages = Math.ceil(filteredProfiles.length / USERS_PER_PAGE)

  const filteredChannels = channels.filter((ch) => {
    if (channelSearch) {
      const q = channelSearch.toLowerCase()
      if (
        !ch.name?.toLowerCase().includes(q) &&
        !ch.telegram_username?.toLowerCase().includes(q)
      )
        return false
    }
    if (channelVerificationFilter !== 'all' && ch.verification_status !== channelVerificationFilter)
      return false
    if (channelActiveFilter === 'active' && !ch.is_active) return false
    if (channelActiveFilter === 'inactive' && ch.is_active) return false
    return true
  })

  const filteredCampaigns = campaigns.filter((c) => {
    if (campaignSearch && !c.name?.toLowerCase().includes(campaignSearch.toLowerCase())) return false
    if (campaignStatusFilter !== 'all' && c.status !== campaignStatusFilter) return false
    return true
  })

  const filteredRequests = adRequests.filter((r) => {
    if (requestSearch && !r.advertiser_name?.toLowerCase().includes(requestSearch.toLowerCase()))
      return false
    if (requestStatusFilter !== 'all' && r.status !== requestStatusFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/50">Загрузка...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <div className="text-white text-xl font-semibold mb-2">Доступ запрещён</div>
          <div className="text-white/50">Перенаправление на dashboard...</div>
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Пользователи', value: stats.users, icon: '👥', color: 'text-blue-400' },
    { label: 'Каналов', value: stats.channels, icon: '📺', color: 'text-purple-400' },
    {
      label: 'На верификации',
      value: stats.pendingChannels,
      icon: '⏳',
      color: 'text-yellow-400',
      onClick: () => setSection('channels'),
    },
    { label: 'Кампаний', value: stats.campaigns, icon: '📋', color: 'text-green-400' },
    { label: 'Запросов', value: stats.requests, icon: '📨', color: 'text-orange-400' },
    { label: 'Отзывов', value: stats.reviews, icon: '⭐', color: 'text-pink-400' },
  ]

  return (
    <div className="bg-[#0a0a0f] min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-xl font-bold">
            Adver<span className="text-red-400">Link</span>
          </span>
          <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-1 rounded-full">
            🛡️ Admin Panel
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm">{adminEmail}</span>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="border border-white/20 text-white/70 hover:text-white hover:bg-white/5 rounded-full px-4 py-2 text-sm transition"
          >
            На сайт
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-full px-4 py-2 text-sm transition"
          >
            Выйти
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-56 h-full bg-black/50 border-r border-white/10 pt-20 px-3 z-40">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.section}
            type="button"
            onClick={() => setSection(item.section)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer w-full mb-1 transition ${
              section === item.section
                ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                : 'text-white/50 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main className="ml-56 pt-20 p-8">
        {/* OVERVIEW */}
        {section === 'overview' && (
          <>
            <h1 className="text-2xl font-bold text-white mb-6">Обзор платформы</h1>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {statCards.map((card) => (
                <button
                  key={card.label}
                  type="button"
                  onClick={card.onClick}
                  className={`bg-white/5 border border-white/10 rounded-2xl p-6 relative text-left transition hover:border-white/20 ${
                    card.onClick ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span className={`text-4xl opacity-20 absolute right-4 top-4 ${card.color}`}>
                    {card.icon}
                  </span>
                  <div className="text-3xl font-bold text-white mb-1">{card.value}</div>
                  <div className="text-white/50 text-sm">{card.label}</div>
                </button>
              ))}
            </div>

            <h2 className="text-white font-semibold mb-4">Последняя активность</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                      Рекламодатель
                    </th>
                    <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                      Бюджет
                    </th>
                    <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                      Статус
                    </th>
                    <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                      Дата
                    </th>
                    <th className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentRequests.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                      <td className="px-4 py-3 text-white text-sm">{r.advertiser_name || '—'}</td>
                      <td className="px-4 py-3 text-white text-sm">${r.budget}</td>
                      <td className="px-4 py-3">
                        <span className={statusBadge(r.status)}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-sm">
                        {new Date(r.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => deleteRequest(r.id, true)}
                          className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* USERS */}
        {section === 'users' && (
          <>
            <h1 className="text-2xl font-bold text-white mb-6">Пользователи</h1>
            <input
              type="text"
              placeholder="Поиск по имени или ID..."
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value)
                setUserPage(0)
              }}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-red-500/50 transition text-sm w-full max-w-md mb-6"
            />
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      {['', 'ID', 'Имя', 'Email / ID', 'Дата', 'План', 'Уровень', 'Админ', 'Действия'].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProfiles.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                        <td className="px-4 py-3">
                          <div className="w-8 h-8 rounded-full bg-red-500/30 flex items-center justify-center text-white text-sm font-bold">
                            {(p.full_name || p.id)?.[0]?.toUpperCase()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => copyId(p.id)}
                            className="text-white/50 text-xs font-mono hover:text-white transition"
                            title="Копировать ID"
                          >
                            {p.id.slice(0, 8)}...
                          </button>
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{p.full_name || '—'}</td>
                        <td className="px-4 py-3 text-white/50 text-xs font-mono">{p.id.slice(0, 12)}...</td>
                        <td className="px-4 py-3 text-white/50 text-sm">
                          {new Date(p.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded-full text-xs">
                            {(p.subscription_plan || 'free').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
                            Lv.{p.level || 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleAdmin(p)}
                            className="relative w-10 h-5 rounded-full transition-colors"
                            style={{
                              background: p.is_admin ? '#ef4444' : 'rgba(255,255,255,0.15)',
                            }}
                          >
                            <span
                              className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                              style={{ transform: p.is_admin ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => deleteUser(p)}
                            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={userPage === 0}
                onClick={() => setUserPage((p) => p - 1)}
                className="border border-white/20 text-white/70 disabled:opacity-30 rounded-lg px-4 py-2 text-sm"
              >
                ← Назад
              </button>
              <span className="text-white/50 text-sm">
                Стр. {userPage + 1} из {Math.max(1, totalUserPages)}
              </span>
              <button
                type="button"
                disabled={userPage >= totalUserPages - 1}
                onClick={() => setUserPage((p) => p + 1)}
                className="border border-white/20 text-white/70 disabled:opacity-30 rounded-lg px-4 py-2 text-sm"
              >
                Вперёд →
              </button>
            </div>
          </>
        )}

        {/* CHANNELS */}
        {section === 'channels' && (
          <>
            <h1 className="text-2xl font-bold text-white mb-6">Каналы</h1>
            <div className="flex flex-wrap gap-3 mb-6">
              <input
                type="text"
                placeholder="Поиск по названию или username..."
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none text-sm flex-1 min-w-[200px]"
              />
              <select
                value={channelVerificationFilter}
                onChange={(e) => setChannelVerificationFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              >
                <option value="all">Все статусы</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={channelActiveFilter}
                onChange={(e) => setChannelActiveFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              >
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      {[
                        '',
                        'Канал',
                        'Владелец',
                        'Подписчиков',
                        'Цена',
                        'Верификация',
                        'Активен',
                        'Действия',
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChannels.map((ch) => (
                      <tr key={ch.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                        <td className="px-4 py-3">
                          {ch.avatar_url ? (
                            <img src={ch.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                              {ch.name?.[0]}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white text-sm font-medium">{ch.name}</div>
                          <div className="text-white/40 text-xs">@{ch.telegram_username}</div>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs font-mono">
                          {ch.owner_id?.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {ch.subscriber_count?.toLocaleString() || 0}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">${ch.ad_price || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(ch.verification_status || 'pending')}>
                            {ch.verification_status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`w-2.5 h-2.5 rounded-full inline-block ${
                              ch.is_active !== false ? 'bg-green-400' : 'bg-gray-500'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => verifyChannel(ch.id)}
                              className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20 rounded-lg px-2 py-1 text-xs"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectChannel(ch.id)}
                              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 rounded-lg px-2 py-1 text-xs"
                            >
                              ✗
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleChannelActive(ch)}
                              className="bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs"
                            >
                              👁
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteChannel(ch.id)}
                              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* CAMPAIGNS */}
        {section === 'campaigns' && (
          <>
            <h1 className="text-2xl font-bold text-white mb-6">Кампании</h1>
            <div className="flex flex-wrap gap-3 mb-6">
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none text-sm flex-1 min-w-[200px]"
              />
              <select
                value={campaignStatusFilter}
                onChange={(e) => setCampaignStatusFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              >
                <option value="all">Все</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    {['Название', 'Рекламодатель', 'Бюджет', 'Категория', 'Статус', 'Дата', 'Действия'].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((c) => (
                    <Fragment key={c.id}>
                      <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03] transition">
                        <td className="px-4 py-3 text-white text-sm font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-white/50 text-sm truncate max-w-[120px]">
                          {c.advertiser_email || c.advertiser_id?.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {Number(c.budget || 0).toLocaleString()} AMD
                        </td>
                        <td className="px-4 py-3">
                          {c.category && (
                            <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-xs">
                              {c.category}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(c.status || 'pending')}>{c.status}</span>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-sm">
                          {new Date(c.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCampaign(expandedCampaign === c.id ? null : c.id)
                              }
                              className="bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs"
                            >
                              📋
                            </button>
                            {c.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => approveCampaign(c.id)}
                                className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20 rounded-lg px-2 py-1 text-xs"
                              >
                                ✓
                              </button>
                            )}
                            {c.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => pauseCampaign(c.id)}
                                className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-lg px-2 py-1 text-xs"
                              >
                                ⏸
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteCampaign(c.id)}
                              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedCampaign === c.id && (
                        <tr key={`${c.id}-detail`} className="bg-white/[0.02]">
                          <td colSpan={7} className="px-4 py-4 text-white/70 text-sm">
                            <p className="mb-2">{c.description || 'Нет описания'}</p>
                            {c.product_link && (
                              <p className="text-white/40 text-xs">Ссылка: {c.product_link}</p>
                            )}
                            {c.requirements && (
                              <p className="text-white/40 text-xs mt-1">Требования: {c.requirements}</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* REQUESTS */}
        {section === 'requests' && (
          <>
            <h1 className="text-2xl font-bold text-white mb-6">Запросы на рекламу</h1>
            <div className="flex flex-wrap gap-3 mb-6">
              <input
                type="text"
                placeholder="Поиск по рекламодателю..."
                value={requestSearch}
                onChange={(e) => setRequestSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 outline-none text-sm flex-1 min-w-[200px]"
              />
              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
              >
                <option value="all">Все</option>
                <option value="new">New</option>
                <option value="replied">Replied</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    {[
                      'Рекламодатель',
                      'Контакт',
                      'Бюджет',
                      'Сообщение',
                      'Статус',
                      'Дата',
                      'Действия',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((r) => (
                    <Fragment key={r.id}>
                      <tr className="border-b border-white/5 hover:bg-white/[0.03] transition">
                        <td className="px-4 py-3 text-white text-sm">{r.advertiser_name || '—'}</td>
                        <td className="px-4 py-3 text-white/50 text-sm truncate max-w-[100px]">
                          {r.advertiser_contact}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">${r.budget}</td>
                        <td className="px-4 py-3 text-white/50 text-sm">
                          {(r.message || '').slice(0, 50)}
                          {(r.message || '').length > 50 ? '...' : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(r.status)}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-sm">
                          {new Date(r.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRequest(expandedRequest === r.id ? null : r.id)
                              }
                              className="bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs"
                            >
                              👁
                            </button>
                            <button
                              type="button"
                              onClick={() => approveRequest(r.id)}
                              className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20 rounded-lg px-2 py-1 text-xs"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRequest(r.id)}
                              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRequest === r.id && (
                        <tr key={`${r.id}-detail`} className="bg-white/[0.02]">
                          <td colSpan={7} className="px-4 py-4 text-white/70 text-sm whitespace-pre-wrap">
                            {r.message || 'Нет сообщения'}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* REVIEWS */}
        {section === 'reviews' && (
          <>
            <h1 className="text-2xl font-bold text-white mb-6">Отзывы</h1>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    {['Автор', 'Рейтинг', 'Комментарий', 'Дата', 'Действия'].map((h) => (
                      <th
                        key={h}
                        className="text-white/40 text-xs font-medium uppercase tracking-wider px-4 py-3 text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <Fragment key={r.id}>
                      <tr className="border-b border-white/5 hover:bg-white/[0.03] transition">
                        <td className="px-4 py-3 text-white/50 text-xs font-mono">
                          {r.reviewer_id?.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          <Stars rating={r.rating} />
                        </td>
                        <td className="px-4 py-3 text-white/70 text-sm">
                          {(r.comment || '').slice(0, 60)}
                          {(r.comment || '').length > 60 ? '...' : ''}
                        </td>
                        <td className="px-4 py-3 text-white/50 text-sm">
                          {new Date(r.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedReview(expandedReview === r.id ? null : r.id)
                              }
                              className="bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs"
                            >
                              👁
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteReview(r.id)}
                              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedReview === r.id && (
                        <tr key={`${r.id}-detail`} className="bg-white/[0.02]">
                          <td colSpan={5} className="px-4 py-4 text-white/70 text-sm">
                            {r.comment || 'Нет комментария'}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* MODERATION */}
        {section === 'moderation' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <h1 className="text-2xl font-bold text-white">Каналы на верификации</h1>
              <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                {pendingChannels.length}
              </span>
            </div>
            {pendingChannels.length === 0 ? (
              <div className="text-green-400 text-center py-12 text-lg">✓ Все каналы проверены</div>
            ) : (
              pendingChannels.map((ch) => (
                <div
                  key={ch.id}
                  className="bg-white/5 border border-yellow-500/20 rounded-2xl p-6 mb-4"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {ch.avatar_url ? (
                      <img src={ch.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center text-white text-xl font-bold">
                        {ch.name?.[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-bold text-lg">{ch.name}</div>
                      <div className="text-white/40 text-sm">@{ch.telegram_username}</div>
                      <div className="text-white/50 text-sm mt-1">
                        {ch.subscriber_count?.toLocaleString()} подписчиков
                      </div>
                    </div>
                  </div>
                  {ch.description && (
                    <p className="text-white/60 text-sm mb-3">{ch.description}</p>
                  )}
                  <div className="text-white/40 text-xs mb-2">
                    Владелец: {ch.owner_id?.slice(0, 8)}... · Добавлен:{' '}
                    {new Date(ch.created_at).toLocaleDateString('ru-RU')}
                  </div>
                  {ch.telegram_username && (
                    <a
                      href={`https://t.me/${ch.telegram_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-sm hover:underline mb-4 inline-block"
                    >
                      Открыть в Telegram →
                    </a>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => verifyChannel(ch.id)}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-sm transition"
                    >
                      ✓ ВЕРИФИЦИРОВАТЬ
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectChannel(ch.id)}
                      className="flex-1 border-2 border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold py-3 rounded-xl text-sm transition"
                    >
                      ✗ ОТКЛОНИТЬ
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* PLATFORM */}
        {section === 'platform' && (
          <>
            <h1 className="text-2xl font-bold text-white mb-6">Настройки платформы</h1>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-white font-semibold mb-4">Категории каналов</h2>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-2 border-b border-white/5"
                >
                  <span className="text-white text-sm">
                    {cat.icon} {cat.name} ({cat.slug})
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat.id)}
                    className="bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg px-2 py-1 text-xs"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 mt-4">
                <input
                  type="text"
                  placeholder="Название"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm flex-1 min-w-[120px]"
                />
                <input
                  type="text"
                  placeholder="slug"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory((p) => ({ ...p, slug: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm w-28"
                />
                <input
                  type="text"
                  placeholder="📁"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory((p) => ({ ...p, icon: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm w-16"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 rounded-xl px-4 py-2 text-sm"
                >
                  Добавить
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <h2 className="text-white font-semibold mb-4">Статистика платформы</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-white/50">
                  Всего пользователей:{' '}
                  <span className="text-white font-bold">{platformStats.users}</span>
                </div>
                <div className="text-white/50">
                  Верифицированных каналов:{' '}
                  <span className="text-white font-bold">{platformStats.verifiedChannels}</span>
                </div>
                <div className="text-white/50">
                  Активных кампаний:{' '}
                  <span className="text-white font-bold">{platformStats.activeCampaigns}</span>
                </div>
                <div className="text-white/50">
                  Завершённых сделок:{' '}
                  <span className="text-white font-bold">{platformStats.completedDeals}</span>
                </div>
                <div className="text-white/50 col-span-2">
                  Общий оборот:{' '}
                  <span className="text-green-400 font-bold text-lg">
                    ${platformStats.totalRevenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4">Системные настройки</h2>
              {[
                {
                  key: 'registrationOpen' as const,
                  label: 'Регистрация открыта',
                  storage: 'adverlink_reg_open',
                },
                {
                  key: 'channelVerification' as const,
                  label: 'Верификация каналов',
                  storage: 'adverlink_verify_channels',
                },
                {
                  key: 'campaignCreation' as const,
                  label: 'Создание кампаний',
                  storage: 'adverlink_create_campaigns',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex justify-between items-center py-3 border-b border-white/5"
                >
                  <span className="text-white text-sm">{item.label}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPlatformSettings((p) => ({ ...p, [item.key]: !p[item.key] }))
                    }
                    className="relative w-11 h-6 rounded-full transition-colors"
                    style={{
                      background: platformSettings[item.key]
                        ? '#ef4444'
                        : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                      style={{
                        transform: platformSettings[item.key]
                          ? 'translateX(20px)'
                          : 'translateX(0)',
                      }}
                    />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={savePlatformSettings}
                className="mt-4 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 rounded-xl px-6 py-2.5 text-sm font-medium"
              >
                Сохранить настройки
              </button>
            </div>
          </>
        )}
      </main>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg transition-all ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {toast.type === 'success' ? '✓ ' : '✗ '}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
