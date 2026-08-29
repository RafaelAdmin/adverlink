import { NextRequest } from 'next/server'
import { acceptFinalTerms } from '@/lib/server/deal-actions'
import { dealActionErrorResponse, dealActionSuccess, withParticipant } from '@/lib/server/deal-route-handler'
import { DealActionError } from '@/lib/server/deal-errors'

const ACCEPT_BODY_KEYS = new Set(['proposedAt'])

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    const { session } = await withParticipant(dealId)

    let proposedAt: string | undefined
    try {
      const body = await request.json()
      if (body && typeof body === 'object') {
        for (const key of Object.keys(body as Record<string, unknown>)) {
          if (!ACCEPT_BODY_KEYS.has(key)) {
            throw new DealActionError(`Unexpected field: ${key}`, 400)
          }
        }
        if (typeof (body as Record<string, unknown>).proposedAt === 'string') {
          proposedAt = (body as Record<string, unknown>).proposedAt as string
        }
      }
    } catch (error) {
      if (error instanceof DealActionError) throw error
      /* empty body is allowed */
    }

    const bundle = await acceptFinalTerms(dealId, session.user.id, { proposedAt })
    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
