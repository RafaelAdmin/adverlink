/**
 * Engagement rate (ER) = (avg_views / subscribers) × 100
 * Uses channel fields from Telegram/YouTube fetch or manual entry.
 */
export function getEngagementRatePercent(
  subscribers: number | null | undefined,
  avgViews: number | null | undefined,
): number | null {
  const subs = Number(subscribers) || 0
  const views = Number(avgViews) || 0
  if (subs <= 0 || views <= 0) return null
  return Math.round((views / subs) * 1000) / 10
}

export function formatEngagementRate(
  subscribers: number | null | undefined,
  avgViews: number | null | undefined,
): string | null {
  const rate = getEngagementRatePercent(subscribers, avgViews)
  return rate !== null ? `${rate}%` : null
}
