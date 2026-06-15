'use client'

/*
Run in Supabase SQL Editor:

drop policy if exists "Anyone can view reviews" on reviews;
drop policy if exists "Logged in users can insert reviews" on reviews;
drop policy if exists "Admins full access on reviews" on reviews;

create policy "Users can view reviews about them or by them"
on reviews for select
using (
  reviewee_id = auth.uid()
  or reviewer_id = auth.uid()
  or auth.uid() in (select id from profiles where is_admin = true)
);

create policy "Logged in users can insert reviews"
on reviews for insert
with check (
  auth.uid() = reviewer_id
);

create policy "Admins full access on reviews"
on reviews for all
using (
  auth.uid() in (select id from profiles where is_admin = true)
);
*/

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Tab = 'about' | 'mine'

function StarRating({ rating }: { rating: number }) {
  const stars = Math.min(5, Math.max(1, Math.round(rating)))
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: stars }).map((_, i) => (
        <i key={i} className="ti ti-star-filled" style={{ color: '#eab308', fontSize: '16px' }} />
      ))}
    </div>
  )
}

function ReviewCard({ review, tab }: { review: any; tab: Tab }) {
  const profile = tab === 'about' ? review.reviewer : review.reviewee
  const profileName = profile?.full_name || profile?.username || 'Пользователь'
  const label = tab === 'about' ? `От: ${profileName}` : `Кому: ${profileName}`

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: 'var(--accent-primary, #9333ea)' }}
            >
              {profileName[0].toUpperCase()}
            </div>
          )}
          <div className="text-white font-medium truncate">{label}</div>
        </div>
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const [{ data: aboutMe }, { data: byMe }] = await Promise.all([
        supabase
          .from('reviews')
          .select('*, reviewer:profiles!reviewer_id(id, full_name, username, avatar_url)')
          .eq('reviewee_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('*, reviewee:profiles!reviewee_id(id, full_name, username, avatar_url)')
          .eq('reviewer_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      console.log('Current user ID:', user.id)
      console.log('Reviews about me (reviewee_id = me):', aboutMe)
      console.log('Reviews by me (reviewer_id = me):', byMe)

      setAboutMeReviews(aboutMe || [])
      setMyReviews(byMe || [])
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
            <ReviewCard key={review.id} review={review} tab={tab} />
          ))}
        </div>
      )}
    </div>
  )
}
