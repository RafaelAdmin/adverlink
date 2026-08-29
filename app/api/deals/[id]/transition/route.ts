import { NextRequest, NextResponse } from 'next/server'
import { executeGenericDealTransition } from '@/lib/server/deal-actions'
import { parseGenericTransitionBody } from '@/lib/server/deal-transition-policy'
import {
  dealActionErrorResponse,
  dealActionSuccess,
  withDealContext,
} from '@/lib/server/deal-route-handler'
import { DealActionError } from '@/lib/server/deal-errors'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    const { session, role } = await withDealContext(dealId)

    if (session.isAdmin) {
      throw new DealActionError('Admin must use dedicated endpoints', 403)
    }

    if (!role) {
      throw new DealActionError('Forbidden', 403)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
    }

    const payload = parseGenericTransitionBody(body)
    const bundle = await executeGenericDealTransition(dealId, session.user.id, role, payload)

    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 })
}
