import { NextRequest } from 'next/server'
import { reportPlacementIssue } from '@/lib/server/deal-actions'
import { dealActionErrorResponse, dealActionSuccess, withAdvertiser } from '@/lib/server/deal-route-handler'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    const { session } = await withAdvertiser(dealId)
    const body = await request.json()
    const placementIndex = Number(body.placementIndex)
    const issueComment = String(body.issueComment || '')

    if (!placementIndex || placementIndex < 1) {
      return dealActionErrorResponse(new Error('placementIndex required'))
    }

    const bundle = await reportPlacementIssue(dealId, session.user.id, placementIndex, issueComment)
    return dealActionSuccess(bundle)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
