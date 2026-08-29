import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/notify-auth'
import { publishPlacementProof } from '@/lib/server/deal-actions'
import { associateTelegramProof } from '@/lib/server/telegram-deal-proof'
import { isDealActionError } from '@/lib/server/deal-errors'

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

export async function POST(request: NextRequest) {
  const session = await requireAuth()
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = session

  if (
    !checkRateLimit(rateLimitStore, `associate-post:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  ) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
  }

  let body: { dealId?: string; postUrl?: string; placementIndex?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
  }

  const { dealId, postUrl, placementIndex } = body
  if (!dealId || !postUrl) {
    return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 })
  }

  try {
    if (placementIndex != null && placementIndex >= 1) {
      const bundle = await publishPlacementProof(dealId, user.id, placementIndex, postUrl)
      return NextResponse.json({ ok: true, deal: bundle.deal, placements: bundle.placements })
    }

    const result = await associateTelegramProof({
      dealId,
      postUrl,
      userId: user.id,
      requireCreator: true,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (isDealActionError(error)) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
    }
    console.error('[associate-post]', error)
    return NextResponse.json({ ok: false, error: 'Association failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 })
}
