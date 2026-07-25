import { Fragment } from 'react'
import { Stars } from './admin-utils'

type AdminReviewsProps = {
  reviews: any[]
  expandedReview: string | null
  onExpandReview: (id: string | null) => void
  onDelete: (id: string) => void
}

export default function AdminReviews({
  reviews,
  expandedReview,
  onExpandReview,
  onDelete,
}: AdminReviewsProps) {
  return (
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
                          onExpandReview(expandedReview === r.id ? null : r.id)
                        }
                        className="bg-white/5 text-white/50 hover:bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-xs"
                      >
                        👁
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(r.id)}
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
  )
}
