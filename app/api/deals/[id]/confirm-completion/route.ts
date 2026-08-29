import { NextRequest, NextResponse } from 'next/server'
import { confirmDealCompletion } from '@/lib/server/deal-actions'
import { dealActionErrorResponse, dealActionSuccess, withAdvertiser } from '@/lib/server/deal-route-handler'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    await withAdvertiser(dealId)
    const bundle = await confirmDealCompletion(dealId)
    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
