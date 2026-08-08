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
import AdminOverview from './components/AdminOverview'
import AdminUsers from './components/AdminUsers'
import AdminChannels from './components/AdminChannels'
import AdminRequests from './components/AdminRequests'
import AdminReviews from './components/AdminReviews'
import AdminModeration from './components/AdminModeration'
import AdminPlatform from './components/AdminPlatform'
import AdminDisputes from './components/AdminDisputes'
import { statusBadge } from './components/admin-utils'

type Section =
  | 'overview'
  | 'users'
  | 'channels'
  | 'campaigns'
  | 'requests'
  | 'disputes'
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
  { icon: '⚖️', label: 'Споры', section: 'disputes' },
  { icon: '⭐', label: 'Отзывы', section: 'reviews' },
  { icon: '🛡️', label: 'Модерация', section: 'moderation' },
  { icon: '⚙️', label: 'Настройки платформы', section: 'platform' },
]

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

  const toggleSubscription = async (profile: any) => {
    const newPlan = profile.subscription_plan === 'pro' ? 'free' : 'pro'
    const msg =
      newPlan === 'pro'
        ? `Выдать Pro подписку пользователю ${profile.full_name || profile.id.slice(0, 8)}?`
        : `Отключить Pro подписку у ${profile.full_name || profile.id.slice(0, 8)}?`
    if (!window.confirm(msg)) return
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_plan: newPlan })
      .eq('id', profile.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setProfiles((prev) =>
      prev.map((p) => (p.id === profile.id ? { ...p, subscription_plan: newPlan } : p)),
    )
    showToast(newPlan === 'pro' ? 'Pro подписка активирована' : 'Pro подписка отключена')
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
        {section === 'overview' && (
          <AdminOverview
            stats={stats}
            recentRequests={recentRequests}
            onNavigateToChannels={() => setSection('channels')}
            onDeleteRequest={(id) => deleteRequest(id, true)}
          />
        )}

        {section === 'users' && (
          <AdminUsers
            profiles={paginatedProfiles}
            userSearch={userSearch}
            userPage={userPage}
            totalUserPages={totalUserPages}
            onSearchChange={(value) => {
              setUserSearch(value)
              setUserPage(0)
            }}
            onPageChange={setUserPage}
            onToggleAdmin={toggleAdmin}
            onToggleSubscription={toggleSubscription}
            onDelete={deleteUser}
            onCopyId={copyId}
          />
        )}

        {section === 'channels' && (
          <AdminChannels
            channels={filteredChannels}
            channelSearch={channelSearch}
            channelVerificationFilter={channelVerificationFilter}
            channelActiveFilter={channelActiveFilter}
            onSearchChange={setChannelSearch}
            onVerificationFilterChange={setChannelVerificationFilter}
            onActiveFilterChange={setChannelActiveFilter}
            onVerify={verifyChannel}
            onReject={rejectChannel}
            onToggleActive={toggleChannelActive}
            onDelete={deleteChannel}
          />
        )}

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

        {section === 'requests' && (
          <AdminRequests
            requests={filteredRequests}
            requestSearch={requestSearch}
            requestStatusFilter={requestStatusFilter}
            expandedRequest={expandedRequest}
            onSearchChange={setRequestSearch}
            onStatusFilterChange={setRequestStatusFilter}
            onExpandRequest={setExpandedRequest}
            onApprove={approveRequest}
            onDelete={(id) => deleteRequest(id)}
          />
        )}

        {section === 'disputes' && (
          <AdminDisputes
            onToast={(message, type) => showToast(message, type)}
            onRefresh={loadData}
          />
        )}

        {section === 'reviews' && (
          <AdminReviews
            reviews={reviews}
            expandedReview={expandedReview}
            onExpandReview={setExpandedReview}
            onDelete={deleteReview}
          />
        )}

        {section === 'moderation' && (
          <AdminModeration
            channels={pendingChannels}
            onVerify={verifyChannel}
            onReject={rejectChannel}
          />
        )}

        {section === 'platform' && (
          <AdminPlatform
            categories={categories}
            newCategory={newCategory}
            onNewCategoryChange={setNewCategory}
            onAddCategory={addCategory}
            onDeleteCategory={deleteCategory}
            platformStats={platformStats}
            platformSettings={platformSettings}
            onPlatformSettingsChange={setPlatformSettings}
            onSavePlatformSettings={savePlatformSettings}
          />
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
