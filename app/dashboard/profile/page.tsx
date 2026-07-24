'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [description, setDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setFullName(profile?.full_name || '')
      setUsername(profile?.username || '')
      setDescription(profile?.description || '')
      setAvatarUrl(profile?.avatar_url || '')

      const { data } = await supabase.from('channels').select('*').eq('owner_id', user.id)

      setChannels(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`)
      window.dispatchEvent(new Event('adverlink-avatar-updated'))
      window.dispatchEvent(new Event('adverlink-profile-updated'))
      setSuccess('Фото обновлено!')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err: any) {
      setError('Ошибка загрузки: ' + err.message)
    }

    setUploading(false)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess('')

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || null,
        description: description.trim().slice(0, 200) || null,
      })
      .eq('id', user.id)
      .select()

    setSaving(false)

    if (error) {
      setError('Ошибка сохранения: ' + error.message)
      console.error('Save error:', error)
    } else {
      setSuccess('✓ Сохранено!')
      setTimeout(() => setSuccess(''), 2000)
      window.dispatchEvent(new Event('adverlink-profile-updated'))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!user) return <div className="text-white/50">Загрузка...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/dashboard')}
        className="text-white/50 hover:text-white transition text-sm mb-8 flex items-center gap-2"
      >
        ← Назад
      </button>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="relative group cursor-pointer">
            <label htmlFor="avatar-upload" className="cursor-pointer">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-24 h-24 rounded-full object-cover"
                  style={{ border: '3px solid rgba(255,255,255,0.15)' }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold"
                  style={{
                    backgroundColor: 'var(--accent-primary, #9333ea)',
                    border: '3px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {user?.email?.[0].toUpperCase()}
                </div>
              )}

              <div
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                <div className="text-center">
                  <i
                    className="ti ti-camera"
                    style={{ fontSize: '20px', color: 'white', display: 'block' }}
                  />
                  <span style={{ color: 'white', fontSize: '10px' }}>
                    {uploading ? 'Загрузка...' : 'Изменить'}
                  </span>
                </div>
              </div>
            </label>

            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </div>

          <p className="text-white/30 text-xs">Нажми на фото чтобы изменить</p>
        </div>

        <div className="text-center mb-6">
          <div className="text-white text-xl font-semibold">{fullName || user.email}</div>
          <div className="text-white/40 text-sm mt-1">
            Участник с {new Date(user.created_at).toLocaleDateString('ru-RU')}
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-white/70 text-sm">Имя</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ваше имя"
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-white/70 text-sm">Имя пользователя</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-white/30 text-sm">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-8 pr-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition text-sm"
              />
            </div>
            <span className="text-white/25 text-xs">Только латинские буквы, цифры и _</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-white/70 text-sm">О себе</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажи о себе, своих каналах или бизнесе..."
              rows={3}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus-accent transition text-sm resize-none"
            />
            <span className="text-white/25 text-xs">{description.length}/200 символов</span>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="text-white rounded-full px-6 py-2 text-sm font-medium self-start"
            style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="border border-red-500/30 text-red-400 hover:bg-red-500/10 transition px-5 py-2 rounded-full text-sm"
        >
          Выйти из аккаунта
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold">Мои каналы</h2>
          <button
            onClick={() => router.push('/dashboard/add-channel')}
            className="btn-accent transition text-white px-5 py-2 rounded-full text-sm font-medium"
          >
            + Добавить канал
          </button>
        </div>

        {loading ? (
          <div className="text-white/50 text-center py-8">Загрузка...</div>
        ) : channels.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📺</div>
            <div className="text-white/50 text-sm">У тебя пока нет каналов</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full avatar-accent-fallback flex items-center justify-center text-white font-bold flex-shrink-0">
                  {channel.name[0]}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">{channel.name}</div>
                  <div className="text-white/40 text-sm">@{channel.telegram_username}</div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs ${
                    channel.verification_status === 'verified'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {channel.verification_status === 'verified' ? '✓ Верифицирован' : '⏳ На проверке'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
