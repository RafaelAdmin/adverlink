import { NextRequest } from 'next/server'
import { parseTermsProposalBody, proposeFinalTerms } from '@/lib/server/deal-actions'
import { dealActionErrorResponse, dealActionSuccess, withParticipant } from '@/lib/server/deal-route-handler'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    const { session } = await withParticipant(dealId)
    const body = parseTermsProposalBody(await request.json())
    const bundle = await proposeFinalTerms(dealId, session.user.id, body)
    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
