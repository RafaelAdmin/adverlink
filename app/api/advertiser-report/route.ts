import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { requireProReportAccess } from '@/lib/report-access'
import { filterByDateRange, formatPeriodLabel, parseReportRange } from '@/lib/subscriptions'

export async function GET(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await requireProReportAccess(session)
  if (!access.ok) return access.response

  const fromParam = request.nextUrl.searchParams.get('from')
  const toParam = request.nextUrl.searchParams.get('to')

  const defaultTo = new Date()
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 30)

  const { from, to } = parseReportRange(
    fromParam || defaultFrom.toISOString().split('T')[0],
    toParam || defaultTo.toISOString().split('T')[0],
  )

  const { supabase, user } = session

  const [campaignsRes, requestsRes] = await Promise.all([
    supabase
      .from('campaigns')
      .select('*')
      .eq('advertiser_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ad_requests')
      .select('*, channels(name, avg_views)')
      .eq('advertiser_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const campaigns = filterByDateRange(campaignsRes.data || [], from, to)
  const requests = filterByDateRange(
    (requestsRes.data || []).map((r: any) => ({
      ...r,
      channel_name: r.channels?.name,
      reach: r.channels?.avg_views || 0,
    })),
    from,
    to,
  )

  const completed = requests.filter((r: any) => r.status === 'completed')
  const totalSpent = completed.reduce((sum, r) => sum + (Number(r.budget) || 0), 0)
  const totalReach = completed.reduce((sum, r) => sum + (Number(r.reach) || 0), 0)
  const avgReach = completed.length > 0 ? Math.round(totalReach / completed.length) : 0
  const costPerView = totalReach > 0 ? `$${(totalSpent / totalReach).toFixed(4)}` : '—'

  return NextResponse.json({
    campaigns,
    requests,
    periodLabel: formatPeriodLabel(from, to),
    stats: {
      totalCampaigns: campaigns.length,
      completedDeals: completed.length,
      totalSpent,
      avgReach,
      costPerView,
    },
  })
}
