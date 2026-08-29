import { NextRequest } from 'next/server'
import { resolveDealDispute } from '@/lib/server/deal-actions'
import type { DealStatus } from '@/lib/deal-lifecycle'
import { dealActionErrorResponse, dealActionSuccess, withAdmin } from '@/lib/server/deal-route-handler'
import { DealActionError } from '@/lib/server/deal-errors'

const RESOLVE_BODY_KEYS = new Set(['toStatus'])

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await withAdmin()
    const { id: dealId } = await context.params
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      throw new DealActionError('Invalid body', 400)
    }

    for (const key of Object.keys(body as Record<string, unknown>)) {
      if (!RESOLVE_BODY_KEYS.has(key)) {
        throw new DealActionError(`Unexpected field: ${key}`, 400)
      }
    }

    const toStatus = body.toStatus as Extract<DealStatus, 'resolved_creator' | 'resolved_advertiser'>

    if (toStatus !== 'resolved_creator' && toStatus !== 'resolved_advertiser') {
      throw new DealActionError('Invalid toStatus', 400)
    }

    const bundle = await resolveDealDispute(dealId, toStatus)
    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
