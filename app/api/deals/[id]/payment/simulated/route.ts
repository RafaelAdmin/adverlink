import { NextRequest, NextResponse } from 'next/server'
import { executeSimulatedDealPayment } from '@/lib/server/simulated-deal-payment'
import { dealActionErrorResponse, withAdvertiser } from '@/lib/server/deal-route-handler'
import { serializeDealResponse } from '@/lib/server/deal-actions'
import { DealActionError } from '@/lib/server/deal-errors'

export const dynamic = 'force-dynamic'

const ALLOWED_BODY_KEYS = new Set<string>()

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    const { session } = await withAdvertiser(dealId)

    try {
      const body = await request.json()
      if (body && typeof body === 'object') {
        for (const key of Object.keys(body as Record<string, unknown>)) {
          if (!ALLOWED_BODY_KEYS.has(key)) {
            throw new DealActionError(`Unexpected field: ${key}`, 400)
          }
        }
      }
    } catch (error) {
      if (error instanceof DealActionError) throw error
      /* empty body is required — ignore parse errors for empty payloads */
    }

    const result = await executeSimulatedDealPayment(dealId, session.user.id)
    return NextResponse.json({
      ok: true,
      ...serializeDealResponse(result.bundle),
      paymentAlreadyPaid: result.alreadyPaid,
      paymentReference: 'paymentReference' in result ? result.paymentReference : undefined,
    })
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
