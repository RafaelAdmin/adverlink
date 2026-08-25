'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import UserAvatar from '../components/UserAvatar'

type Tab = 'about' | 'mine'

function StarRatingInput({ rating, onChange }: { rating: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1 mb-3">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`text-xl ${s <= rating ? 'text-yellow-400' : 'text-white/20'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function StarRatingDisplay({ rating }: { rating: number }) {
  const stars = Math.min(5, Math.max(1, Math.round(rating)))
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <i key={i} className="ti ti-star-filled" style={{ color: '#eab308', fontSize: '16px' }} />
      ))}
    </div>
  )
}

function ReviewEditForm({
  initialRating,
  initialComment,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initialRating: number
  initialComment: string
  onSave: (rating: number, comment: string) => void
  onCancel: () => void
  saving: boolean
  error: string | null
}) {
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState(initialComment)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4">
      <StarRatingInput rating={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Комментарий..."
        className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm w-full mb-3 resize-none outline-none focus-accent"
      />
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(rating, comment)}
          className="btn-accent text-white rounded-full px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button type="button" onClick={onCancel} className="border border-white/20 text-white/60 rounded-full px-4 py-2 text-sm">
          Отмена
        </button>
      </div>
    </div>
  )
}

function ReviewCard({
  review,
  tab,
  onEdit,
  onDelete,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  saving,
  editError,
}: {
  review: any
  tab: Tab
  onEdit?: (id: string, rating: number, comment: string) => void
  onDelete?: (id: string) => void
  editingId: string | null
  onStartEdit?: (id: string) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string, rating: number, comment: string) => void
  saving: boolean
  editError: string | null
}) {
  const profile = tab === 'about' ? review.reviewer : review.reviewee
  const profileName = profile?.full_name || profile?.username || 'Пользователь'
  const label = tab === 'about' ? `От: ${profileName}` : `Кому: ${profileName}`
  const isEditing = editingId === review.id

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            src={profile?.avatar_url}
            name={profileName}
            size={40}
            frameColor={profile?.avatar_frame_color}
          />
          <div className="text-white font-medium truncate">{label}</div>
        </div>
        <div className="text-white/40 text-xs flex-shrink-0">
          {new Date(review.created_at).toLocaleDateString('ru-RU')}
        </div>
      </div>

      {!isEditing && (
        <>
          <StarRatingDisplay rating={review.rating} />
          {review.comment && (
            <p className="text-white/70 text-sm mt-4 leading-relaxed">{review.comment}</p>
          )}
          {tab === 'mine' && onStartEdit && onDelete && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => onStartEdit(review.id)}
                className="border border-white/20 text-white/70 hover:text-white rounded-full px-4 py-1.5 text-sm transition"
              >
                Редактировать
              </button>
              <button
                type="button"
                onClick={() => onDelete(review.id)}
                className="border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-full px-4 py-1.5 text-sm transition"
              >
                Удалить
              </button>
            </div>
          )}
        </>
      )}

      {isEditing && (
        <ReviewEditForm
          initialRating={review.rating}
          initialComment={review.comment || ''}
          onSave={(rating, comment) => onSaveEdit(review.id, rating, comment)}
          onCancel={onCancelEdit}
          saving={saving}
          error={editError}
        />
      )}
    </div>
  )
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<Tab>('about')
  const [aboutMeReviews, setAboutMeReviews] = useState<any[]>([])
  const [myReviews, setMyReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const profileSelect =
    'id, full_name, username, avatar_url, avatar_frame_color'

  const loadReviews = async (userId: string) => {
    const [{ data: aboutMe }, { data: byMe }] = await Promise.all([
      supabase
        .from('reviews')
        .select(`*, reviewer:profiles!reviewer_id(${profileSelect})`)
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('reviews')
        .select(`*, reviewee:profiles!reviewee_id(${profileSelect})`)
        .eq('reviewer_id', userId)
        .order('created_at', { ascending: false }),
    ])

    setAboutMeReviews(aboutMe || [])
    setMyReviews(byMe || [])
  }

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      await loadReviews(user.id)
      setLoading(false)
    }
    load()
  }, [])

  const handleSaveEdit = async (id: string, rating: number, comment: string) => {
    setSaving(true)
    setEditError(null)
    const { error } = await supabase
      .from('reviews')
      .update({ rating, comment: comment.trim() })
      .eq('id', id)

    setSaving(false)
    if (error) {
      setEditError(error.message)
      return
    }

    setMyReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rating, comment: comment.trim() } : r)),
    )
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить этот отзыв? Это действие необратимо.')) return

    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) {
      alert(error.message)
      return
    }

    setMyReviews((prev) => prev.filter((r) => r.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const reviews = tab === 'about' ? aboutMeReviews : myReviews

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Отзывы</h1>
      <p className="text-white/50 mb-6">Отзывы о вас и отзывы, которые вы оставили</p>

      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab('about')}
          className={`rounded-full px-4 py-2 text-sm transition ${
            tab === 'about' ? 'tab-pill-active' : 'border border-white/20 text-white/70'
          }`}
        >
          Обо мне
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`rounded-full px-4 py-2 text-sm transition ${
            tab === 'mine' ? 'tab-pill-active' : 'border border-white/20 text-white/70'
          }`}
        >
          Мои отзывы
        </button>
      </div>

      {loading ? (
        <div className="text-white/50 text-center py-24">Загрузка...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <i className="ti ti-star" style={{ fontSize: '32px', color: 'rgba(255,255,255,0.3)' }} />
          <p className="text-white/50 text-sm mt-4">
            {tab === 'about'
              ? 'Отзывов пока нет. Завершите первую сделку чтобы получить отзыв.'
              : 'Вы ещё не оставляли отзывов.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              tab={tab}
              editingId={editingId}
              onStartEdit={tab === 'mine' ? setEditingId : undefined}
              onCancelEdit={() => {
                setEditingId(null)
                setEditError(null)
              }}
              onSaveEdit={handleSaveEdit}
              onDelete={tab === 'mine' ? handleDelete : undefined}
              saving={saving}
              editError={editError}
            />
          ))}
        </div>
      )}
    </div>
  )
}
