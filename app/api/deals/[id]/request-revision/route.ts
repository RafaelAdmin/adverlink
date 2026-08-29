import { NextRequest, NextResponse } from 'next/server'
import { requestDealRevision } from '@/lib/server/deal-actions'
import { dealActionErrorResponse, dealActionSuccess, withAdvertiser } from '@/lib/server/deal-route-handler'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    await withAdvertiser(dealId)
    const body = await request.json()
    const bundle = await requestDealRevision(dealId, body.advertiserNote || '')
    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
