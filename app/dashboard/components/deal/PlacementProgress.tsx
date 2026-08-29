'use client'

type PlacementProgressProps = {
  publishedCount: number
  totalCount: number
  percent: number
  hasIssues: boolean
}

export default function PlacementProgress({
  publishedCount,
  totalCount,
  percent,
  hasIssues,
}: PlacementProgressProps) {
  if (totalCount < 1) return null

  const filledBars = Math.round(percent / 10)
  const bar = '█'.repeat(filledBars) + '░'.repeat(10 - filledBars)

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm mb-2">
        <span className="text-white/70">
          {publishedCount} из {totalCount} опубликовано
        </span>
        {hasIssues && (
          <span className="text-red-400 text-xs">Есть проблемы с размещениями</span>
        )}
      </div>
      <div
        className="text-xs font-mono tracking-wider text-white/50"
        aria-hidden
      >
        [{bar}]
      </div>
    </div>
  )
}
