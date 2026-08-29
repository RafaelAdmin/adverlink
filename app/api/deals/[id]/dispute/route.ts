import { NextRequest } from 'next/server'
import { openDealDispute } from '@/lib/server/deal-actions'
import { dealActionErrorResponse, dealActionSuccess, withAdvertiser } from '@/lib/server/deal-route-handler'
import { DealActionError } from '@/lib/server/deal-errors'

const DISPUTE_BODY_KEYS = new Set(['reason'])

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    await withAdvertiser(dealId)
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      throw new DealActionError('Invalid body', 400)
    }

    for (const key of Object.keys(body as Record<string, unknown>)) {
      if (!DISPUTE_BODY_KEYS.has(key)) {
        throw new DealActionError(`Unexpected field: ${key}`, 400)
      }
    }

    const bundle = await openDealDispute(dealId, body.reason || '')
    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
