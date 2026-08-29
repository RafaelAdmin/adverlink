import { NextRequest } from 'next/server'
import { publishPlacementProof } from '@/lib/server/deal-actions'
import { dealActionErrorResponse, dealActionSuccess, withCreator } from '@/lib/server/deal-route-handler'
import { DealActionError } from '@/lib/server/deal-errors'

const PUBLISH_BODY_KEYS = new Set(['placementIndex', 'proofUrl'])

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    const { session } = await withCreator(dealId)
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      throw new DealActionError('Invalid body', 400)
    }

    for (const key of Object.keys(body as Record<string, unknown>)) {
      if (!PUBLISH_BODY_KEYS.has(key)) {
        throw new DealActionError(`Unexpected field: ${key}`, 400)
      }
    }

    const placementIndex = Number(body.placementIndex)
    const proofUrl = String(body.proofUrl || '').trim()

    if (!placementIndex || placementIndex < 1 || !proofUrl) {
      throw new DealActionError('placementIndex and proofUrl required', 400)
    }

    const bundle = await publishPlacementProof(dealId, session.user.id, placementIndex, proofUrl)
    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
