'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Tab = 'about' | 'mine'

function StarRating({ rating }: { rating: number }) {
  const stars = Math.min(5, Math.max(1, Math.round(rating)))
  return <div className="text-yellow-400 text-lg tracking-wide">{'★'.repeat(stars)}</div>
}

function ReviewCard({ review }: { review: any }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="text-white font-medium">Анонимный пользователь</div>
        <div className="text-white/40 text-xs flex-shrink-0">
          {new Date(review.created_at).toLocaleDateString('ru-RU')}
        </div>
      </div>
      <StarRating rating={review.rating} />
      {review.comment && (
        <p className="text-white/70 text-sm mt-4 leading-relaxed">{review.comment}</p>
      )}
    </div>
  )
}

export default function ReviewsPage() {
  const [tab, setTab] = useState<Tab>('about')
  const [aboutMeReviews, setAboutMeReviews] = useState<any[]>([])
  const [myReviews, setMyReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const [{ data: aboutMe }, { data: mine }] = await Promise.all([
        supabase
          .from('reviews')
          .select('*')
          .eq('reviewee_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('*')
          .eq('reviewer_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      setAboutMeReviews(aboutMe || [])
      setMyReviews(mine || [])
      setLoading(false)
    }
    load()
  }, [])

  const reviews = tab === 'about' ? aboutMeReviews : myReviews

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Отзывы</h1>
      <p className="text-white/50 mb-6">Отзывы о вас и отзывы, которые вы оставили</p>

      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab('about')}
          className={`rounded-full px-4 py-2 text-sm transition ${
            tab === 'about'
              ? 'bg-purple-600 text-white'
              : 'border border-white/20 text-white/70'
          }`}
        >
          Обо мне
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`rounded-full px-4 py-2 text-sm transition ${
            tab === 'mine'
              ? 'bg-purple-600 text-white'
              : 'border border-white/20 text-white/70'
          }`}
        >
          Мои отзывы
        </button>
      </div>

      {loading ? (
        <div className="text-white/50 text-center py-24">Загрузка...</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">⭐</div>
          <p className="text-white/50 text-sm">
            {tab === 'about'
              ? 'Отзывов пока нет. Завершите первую сделку чтобы получить отзыв.'
              : 'Вы ещё не оставляли отзывов.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  )
}
