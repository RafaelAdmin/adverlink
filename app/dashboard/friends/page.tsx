'use client'

/*
Run in Supabase SQL Editor:

create table if not exists friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references profiles(id) on delete cascade,
  addressee_id uuid references profiles(id) on delete cascade,
  status text default 'pending',
  created_at timestamp with time zone default now(),
  unique(requester_id, addressee_id)
);

create table if not exists blocked_users (
  id uuid default gen_random_uuid() primary key,
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(blocker_id, blocked_id)
);

alter table profiles add column if not exists username text unique;
alter table profiles add column if not exists description text;
alter table profiles add column if not exists friends_count integer default 0;

create policy "Anyone can view friendships"
on friendships for select using (true);

create policy "Users can insert friendships"
on friendships for insert
with check (auth.uid() = requester_id);

create policy "Users can update their friendships"
on friendships for update
using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can delete their friendships"
on friendships for delete
using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Anyone can view profiles"
on profiles for select using (true);

create policy "Anyone can view blocked_users"
on blocked_users for select using (true);

create policy "Users can manage their blocks"
on blocked_users for all
using (auth.uid() = blocker_id);
*/

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import UserProfileCard from '../components/UserProfileCard'

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
}

type Friendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: string
}

type Profile = {
  id: string
  full_name?: string
  username?: string
  avatar_url?: string
  description?: string
  email?: string
}

type PendingItem = {
  friendship: Friendship
  profile: Profile
}

function displayName(profile: Profile) {
  if (profile.full_name) return profile.full_name
  if (profile.email) return profile.email.split('@')[0]
  return 'Пользователь'
}

function Avatar({ profile, size = 48 }: { profile: Profile; size?: number }) {
  const letter = (profile.full_name || profile.username || 'U')[0].toUpperCase()
  const fontSize = size === 48 ? 20 : Math.round(size * 0.35)

  return (
    <>
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url + '?t=' + Date.now()}
          alt={profile.full_name || 'User'}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
            border: '2px solid rgba(255,255,255,0.1)',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.nextElementSibling as HTMLElement
            if (fallback) fallback.style.display = 'flex'
          }}
        />
      ) : null}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: 'var(--accent-primary, #9333ea)',
          display: profile.avatar_url ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize,
          fontWeight: 'bold',
          flexShrink: 0,
          border: '2px solid rgba(255,255,255,0.1)',
        }}
      >
        {letter}
      </div>
    </>
  )
}

export default function FriendsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [pendingReceived, setPendingReceived] = useState<PendingItem[]>([])
  const [pendingSent, setPendingSent] = useState<PendingItem[]>([])
  const [friendshipMap, setFriendshipMap] = useState<Record<string, Friendship>>({})
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends')
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [profileStats, setProfileStats] = useState<Record<string, { channels: number; campaigns: number }>>({})

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadData = async (uid: string) => {
    const { data: acceptedFriendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .eq('status', 'accepted')

    const friendIds = (acceptedFriendships || []).map((f) =>
      f.requester_id === uid ? f.addressee_id : f.requester_id,
    )

    let friendProfiles: Profile[] = []
    if (friendIds.length > 0) {
      const { data } = await supabase.from('profiles').select('*').in('id', friendIds)
      friendProfiles = data || []
    }

    const fMap: Record<string, Friendship> = {}
    ;(acceptedFriendships || []).forEach((f) => {
      const otherId = f.requester_id === uid ? f.addressee_id : f.requester_id
      fMap[otherId] = f
    })

    const { data: pendingReceivedData } = await supabase
      .from('friendships')
      .select('*')
      .eq('addressee_id', uid)
      .eq('status', 'pending')

    const receivedIds = (pendingReceivedData || []).map((f) => f.requester_id)
    let receivedProfiles: Profile[] = []
    if (receivedIds.length > 0) {
      const { data } = await supabase.from('profiles').select('*').in('id', receivedIds)
      receivedProfiles = data || []
    }
    const receivedItems: PendingItem[] = (pendingReceivedData || []).map((f) => ({
      friendship: f,
      profile: receivedProfiles.find((p) => p.id === f.requester_id) || { id: f.requester_id },
    }))

    const { data: pendingSentData } = await supabase
      .from('friendships')
      .select('*')
      .eq('requester_id', uid)
      .eq('status', 'pending')

    const sentIds = (pendingSentData || []).map((f) => f.addressee_id)
    let sentProfiles: Profile[] = []
    if (sentIds.length > 0) {
      const { data } = await supabase.from('profiles').select('*').in('id', sentIds)
      sentProfiles = data || []
    }
    const sentItems: PendingItem[] = (pendingSentData || []).map((f) => ({
      friendship: f,
      profile: sentProfiles.find((p) => p.id === f.addressee_id) || { id: f.addressee_id },
    }))

    setFriends(friendProfiles)
    setFriendshipMap(fMap)
    setPendingReceived(receivedItems)
    setPendingSent(sentItems)
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUserId(user.id)
      await loadData(user.id)
    }
    init()
  }, [])

  const searchUsers = async (query: string) => {
    if (!query || query.trim().length < 1) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)

    const cleanQuery = query.trim()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, description, subscription_plan')
      .or(`full_name.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%`)
      .limit(10)

    if (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const filtered = (data || []).filter((p) => p.id !== user?.id)
      setSearchResults(filtered)

      const stats: Record<string, { channels: number; campaigns: number }> = {}
      await Promise.all(
        filtered.map(async (p) => {
          const [{ count: ch }, { count: camp }] = await Promise.all([
            supabase.from('channels').select('*', { count: 'exact', head: true }).eq('owner_id', p.id),
            supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('advertiser_id', p.id),
          ])
          stats[p.id] = { channels: ch || 0, campaigns: camp || 0 }
        }),
      )
      setProfileStats((prev) => ({ ...prev, ...stats }))
    }

    setSearchLoading(false)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        searchUsers(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const getFriendshipStatus = (profileId: string) => {
    if (friends.some((f) => f.id === profileId)) return 'friends'
    if (pendingSent.some((f) => f.profile.id === profileId)) return 'sent'
    if (pendingReceived.some((f) => f.profile.id === profileId)) return 'received'
    return 'none'
  }

  const removeFriend = async (friendId: string) => {
    const friendship = friendshipMap[friendId]
    if (!friendship) return
    await supabase.from('friendships').delete().eq('id', friendship.id)
    setFriends((prev) => prev.filter((f) => f.id !== friendId))
    const next = { ...friendshipMap }
    delete next[friendId]
    setFriendshipMap(next)
    showToast('Удалён из друзей')
  }

  const acceptRequest = async (item: PendingItem) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', item.friendship.id)
    setPendingReceived((prev) => prev.filter((p) => p.friendship.id !== item.friendship.id))
    setFriends((prev) => [...prev, item.profile])
    setFriendshipMap((prev) => ({ ...prev, [item.profile.id]: { ...item.friendship, status: 'accepted' } }))
    showToast('Заявка принята')
  }

  const rejectRequest = async (item: PendingItem) => {
    await supabase.from('friendships').delete().eq('id', item.friendship.id)
    setPendingReceived((prev) => prev.filter((p) => p.friendship.id !== item.friendship.id))
  }

  const cancelSent = async (item: PendingItem) => {
    await supabase.from('friendships').delete().eq('id', item.friendship.id)
    setPendingSent((prev) => prev.filter((p) => p.friendship.id !== item.friendship.id))
  }

  const addFriend = async (profile: Profile) => {
    const { data } = await supabase
      .from('friendships')
      .insert({ requester_id: userId, addressee_id: profile.id, status: 'pending' })
      .select()
      .single()
    if (data) {
      setPendingSent((prev) => [...prev, { friendship: data, profile }])
      showToast('Заявка отправлена')
    }
  }

  const blockUser = async (profile: Profile) => {
    if (!window.confirm('Заблокировать этого пользователя?')) return
    await supabase.from('blocked_users').insert({ blocker_id: userId, blocked_id: profile.id })
    setSearchResults((prev) => prev.filter((p) => p.id !== profile.id))
    showToast('Пользователь заблокирован')
  }

  const tabBtn = (tab: typeof activeTab, label: string, badge?: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition ${
        activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white'
      }`}
      style={
        activeTab === tab
          ? {
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
            }
          : { background: 'transparent', border: '1px solid transparent' }
      }
    >
      {label}
      {badge}
    </button>
  )

  const SearchResultCard = ({ profile }: { profile: Profile }) => {
    const status = getFriendshipStatus(profile.id)
    const stats = profileStats[profile.id]

    return (
      <div
        className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer"
        style={glassCard}
        onClick={() => setSelectedProfileId(profile.id)}
      >
        <Avatar profile={profile} size={56} />
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold">{displayName(profile)}</div>
          {profile.username && (
            <div className="text-white/40 text-sm">@{profile.username}</div>
          )}
          {profile.description && (
            <div
              className="text-white/30 text-xs mt-1"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {profile.description}
            </div>
          )}
          {stats && (
            <div className="text-white/30 text-xs mt-1">
              {stats.channels > 0 ? `${stats.channels} каналов` : `${stats.campaigns} кампаний`}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {status === 'none' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                addFriend(profile)
              }}
              className="text-white rounded-full px-4 py-2 text-sm flex items-center gap-2"
              style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
            >
              <i className="ti ti-user-plus" style={{ fontSize: '14px' }} />
              Добавить в друзья
            </button>
          )}
          {status === 'sent' && (
            <button
              type="button"
              disabled
              className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-4 py-2 text-sm flex items-center gap-2"
            >
              <i className="ti ti-clock" style={{ fontSize: '14px' }} />
              Заявка отправлена
            </button>
          )}
          {status === 'received' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const item = pendingReceived.find((p) => p.profile.id === profile.id)
                  if (item) acceptRequest(item)
                }}
                className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-4 py-2 text-sm"
              >
                Принять
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const item = pendingReceived.find((p) => p.profile.id === profile.id)
                  if (item) rejectRequest(item)
                }}
                className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-4 py-2 text-sm"
              >
                Отклонить
              </button>
            </div>
          )}
          {status === 'friends' && (
            <div className="flex flex-col items-end gap-2">
              <span className="text-green-400 text-sm">Уже друзья ✓</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFriend(profile.id)
                }}
                className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-4 py-2 text-sm"
              >
                Удалить
              </button>
            </div>
          )}
          {status !== 'friends' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                blockUser(profile)
              }}
              className="bg-white/5 text-white/30 border border-white/10 rounded-full px-3 py-1.5 text-xs"
            >
              Заблокировать
            </button>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="text-white/50">Загрузка...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Друзья</h1>
        <span className="bg-white/10 text-white/60 rounded-full px-3 py-1 text-sm">
          {friends.length} {friends.length === 1 ? 'друг' : 'друзей'}
        </span>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabBtn(
          'friends',
          'Друзья',
          <span className="bg-white/10 text-white/50 rounded-full px-2 py-0.5 text-xs">{friends.length}</span>,
        )}
        {tabBtn(
          'requests',
          'Заявки',
          pendingReceived.length > 0 ? (
            <span className="relative flex items-center gap-1">
              <span className="bg-red-500/20 text-red-400 rounded-full px-2 py-0.5 text-xs">
                {pendingReceived.length}
              </span>
              <span className="w-2 h-2 bg-red-500 rounded-full" />
            </span>
          ) : null,
        )}
        {tabBtn('search', 'Найти друзей')}
      </div>

      {activeTab === 'friends' && (
        <>
          {friends.length === 0 ? (
            <div className="text-center py-16">
              <i className="ti ti-users" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-white/50 mt-4">У вас пока нет друзей</p>
              <p className="text-white/30 text-sm mt-2">Найдите людей в поиске и добавьте их в друзья</p>
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className="mt-6 text-white rounded-full px-6 py-2 text-sm"
                style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
              >
                Найти друзей
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => setSelectedProfileId(friend.id)}
                  style={{
                    ...glassCard,
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Avatar profile={friend} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">{displayName(friend)}</div>
                    {friend.username && (
                      <div className="text-white/40 text-sm">@{friend.username}</div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      disabled
                      className="bg-white/5 text-white/30 border border-white/10 rounded-full px-4 py-2 text-sm flex items-center gap-2"
                    >
                      <i className="ti ti-message" style={{ fontSize: '14px' }} />
                      Написать
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFriend(friend.id)
                      }}
                      className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-4 py-2 text-sm flex items-center gap-2"
                    >
                      <i className="ti ti-user-minus" style={{ fontSize: '14px' }} />
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'requests' && (
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-white/60 text-sm font-medium mb-3">Входящие заявки</h2>
            {pendingReceived.length === 0 ? (
              <p className="text-white/30 text-sm">Нет входящих заявок</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingReceived.map((item) => (
                  <div
                    key={item.friendship.id}
                    style={{ ...glassCard, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                  >
                    <Avatar profile={item.profile} size={48} />
                    <div className="flex-1">
                      <div className="text-white font-medium">{displayName(item.profile)}</div>
                      <div className="text-white/40 text-sm">хочет добавить вас в друзья</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => acceptRequest(item)}
                        className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-4 py-2 text-sm"
                      >
                        ✓ Принять
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectRequest(item)}
                        className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-4 py-2 text-sm"
                      >
                        ✗ Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-white/60 text-sm font-medium mb-3">Исходящие заявки</h2>
            {pendingSent.length === 0 ? (
              <p className="text-white/30 text-sm">Нет исходящих заявок</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingSent.map((item) => (
                  <div
                    key={item.friendship.id}
                    style={{ ...glassCard, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                  >
                    <Avatar profile={item.profile} size={48} />
                    <div className="flex-1">
                      <div className="text-white font-medium">{displayName(item.profile)}</div>
                      <span className="bg-yellow-500/20 text-yellow-400 rounded-full px-2 py-0.5 text-xs">
                        Заявка отправлена
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelSent(item)}
                      className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-4 py-2 text-sm"
                    >
                      Отменить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div>
          <div className="relative mb-6">
            <i
              className="ti ti-search absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              style={{ fontSize: '16px' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите имя или @username..."
              style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '12px 16px 12px 44px',
                color: 'white',
                width: '100%',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {searchLoading && (
            <div className="text-white/40 text-sm text-center py-4">
              <i
                className="ti ti-loader"
                style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}
              />
              <span className="ml-2">Поиск...</span>
            </div>
          )}

          {!searchLoading && searchQuery.length >= 1 && searchResults.length === 0 && (
            <div className="text-center py-8">
              <i
                className="ti ti-user-off"
                style={{ fontSize: '32px', color: 'rgba(255,255,255,0.2)' }}
              />
              <p className="text-white/40 text-sm mt-2">Пользователи не найдены</p>
              <p className="text-white/20 text-xs mt-1">Попробуй другое имя или username</p>
            </div>
          )}

          {!searchLoading && searchResults.length > 0 && (
            <div className="flex flex-col gap-3">
              {searchResults.map((profile) => (
                <SearchResultCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 text-white text-sm px-4 py-3 rounded-xl shadow-lg"
          style={{
            background: 'rgba(15,12,41,0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {toast}
        </div>
      )}

      {selectedProfileId && (
        <UserProfileCard
          profileId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}
    </div>
  )
}
