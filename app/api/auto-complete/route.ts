import { NextResponse } from 'next/server'
import { validateCronRequest } from '@/lib/cron-auth'
import { autoCompleteDeal } from '@/lib/server/deal-actions'
import {
  buildLifecycleContext,
  getAdminClient,
  loadDealForAction,
  loadPlacements,
} from '@/lib/server/deal-repository'
import {
  isAutoCompleteEligible,
  isLegacyLifecycleDeal,
  normalizeDealStatus,
  type ContentMode,
  type ContentStatus,
  type TermsStatus,
} from '@/lib/deal-lifecycle'

const LEGACY_AUTO_COMPLETE_MS = 72 * 60 * 60 * 1000

type AutoCompleteRow = {
  id: string
  status: string
  updated_at: string | null
  content_mode: ContentMode | null
  placements_count: number | null
  final_review_started_at: string | null
  all_placements_published_at: string | null
  auto_complete_deadline: string | null
  terms_status: TermsStatus
  terms_locked_at: string | null
  content_status: ContentStatus
}

function legacyContextFromRow(row: AutoCompleteRow) {
  return buildLifecycleContext(
    {
      ...(row as unknown as Awaited<ReturnType<typeof loadDealForAction>>),
      channels: null,
    },
    [],
  )
}

export async function GET(request: Request) {
  const authResult = validateCronRequest(
    request.headers.get('authorization'),
    process.env.CRON_SECRET,
  )

  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const admin = getAdminClient()
    const now = new Date()
    const legacyCutoff = new Date(now.getTime() - LEGACY_AUTO_COMPLETE_MS).toISOString()

    let legacyCompleted = 0
    let lifecycleCompleted = 0

    const { data: legacyStale, error: legacyFetchError } = await admin
      .from('ad_requests')
      .select(
        'id, status, updated_at, content_mode, placements_count, final_review_started_at, all_placements_published_at, auto_complete_deadline, terms_status, terms_locked_at, content_status',
      )
      .eq('status', 'submitted')
      .lt('updated_at', legacyCutoff)

    if (legacyFetchError) {
      console.error('Auto-complete legacy fetch error:', legacyFetchError.message)
      return NextResponse.json({ error: 'Failed to fetch legacy deals' }, { status: 500 })
    }

    for (const row of (legacyStale || []) as AutoCompleteRow[]) {
      if (!isLegacyLifecycleDeal(legacyContextFromRow(row))) continue

      const completed = await autoCompleteDeal(row.id, 'submitted')
      if (completed) legacyCompleted += 1
    }

    const { data: lifecycleCandidates, error: lifecycleFetchError } = await admin
      .from('ad_requests')
      .select('id')
      .not('final_review_started_at', 'is', null)
      .not('auto_complete_deadline', 'is', null)
      .neq('status', 'disputed')
      .neq('status', 'completed')
      .lte('auto_complete_deadline', now.toISOString())

    if (lifecycleFetchError) {
      console.error('Auto-complete lifecycle fetch error:', lifecycleFetchError.message)
      return NextResponse.json({ error: 'Failed to fetch lifecycle deals' }, { status: 500 })
    }

    for (const row of lifecycleCandidates || []) {
      const deal = await loadDealForAction(row.id)
      const placements = await loadPlacements(row.id)
      const lifecycle = buildLifecycleContext(deal, placements)

      if (normalizeDealStatus(deal.status) === 'disputed') continue
      if (!isAutoCompleteEligible(lifecycle, now)) continue

      const completed = await autoCompleteDeal(row.id, deal.status)
      if (completed) lifecycleCompleted += 1
    }

    return NextResponse.json({
      success: true,
      completed: legacyCompleted + lifecycleCompleted,
      legacyCompleted,
      lifecycleCompleted,
    })
  } catch (error) {
    console.error('Auto-complete error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
