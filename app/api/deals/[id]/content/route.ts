import { NextRequest } from 'next/server'
import {
  approveCreatorContent,
  parseMaterialSavePayload,
  requestCreatorContentChanges,
  saveAdvertiserMaterial,
  submitCreatorContent,
} from '@/lib/server/deal-actions'
import { dealActionErrorResponse, dealActionSuccess, withAdvertiser, withCreator } from '@/lib/server/deal-route-handler'
import { DealActionError } from '@/lib/server/deal-errors'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: dealId } = await context.params
    const body = await request.json()
    const action = String(body.action || 'save')

    if (action === 'save_advertiser_material') {
      await withAdvertiser(dealId)
      const payload = parseMaterialSavePayload(body)
      const bundle = await saveAdvertiserMaterial(dealId, payload)
      return dealActionSuccess(bundle)
    }

    if (action === 'submit_creator_content') {
      await withCreator(dealId)
      const payload = parseMaterialSavePayload(body)
      const bundle = await submitCreatorContent(dealId, payload)
      return dealActionSuccess(bundle)
    }

    if (action === 'approve_creator_content') {
      await withAdvertiser(dealId)
      const bundle = await approveCreatorContent(dealId)
      return dealActionSuccess(bundle)
    }

    if (action === 'request_content_changes') {
      await withAdvertiser(dealId)
      parseMaterialSavePayload(body)
      const bundle = await requestCreatorContentChanges(dealId, body.comment || '')
      return dealActionSuccess(bundle)
    }

    throw new DealActionError('Unknown action', 400)
  } catch (error) {
    return dealActionErrorResponse(error)
  }
}
