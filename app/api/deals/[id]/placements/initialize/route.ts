import { NextRequest } from 'next/server'
import { initializePlacements } from '@/lib/server/deal-actions'
import { dealActionErrorResponse, dealActionSuccess, withCreator } from '@/lib/server/deal-route-handler'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    await withCreator(dealId)
    const bundle = await initializePlacements(dealId)
    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
