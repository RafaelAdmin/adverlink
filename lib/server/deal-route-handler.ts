import { NextResponse } from 'next/server'
import { isDealActionError } from '@/lib/server/deal-errors'
import {
  getParticipantRole,
  requireAdmin,
  requireAdvertiser,
  requireAuthenticatedUser,
  requireCreator,
  requireDealParticipant,
} from '@/lib/server/deal-auth'
import { dealForAuth, loadDealForAction } from '@/lib/server/deal-repository'
import { serializeDealResponse } from '@/lib/server/deal-actions'

export function dealActionErrorResponse(error: unknown) {
  if (isDealActionError(error)) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
  }
  console.error('[deal-action]', error)
  return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 })
}

export function dealActionSuccess(bundle: Awaited<ReturnType<typeof serializeDealResponse>> extends infer T ? Parameters<typeof serializeDealResponse>[0] : never) {
  return NextResponse.json({ ok: true, ...serializeDealResponse(bundle) })
}

export async function withDealContext(dealId: string) {
  const session = await requireAuthenticatedUser()
  const deal = await loadDealForAction(dealId)
  const authDeal = dealForAuth(deal)
  const role = getParticipantRole(authDeal, session.user.id)

  return { session, deal, authDeal, role }
}

export async function withParticipant(dealId: string) {
  const ctx = await withDealContext(dealId)
  const role = requireDealParticipant(ctx.authDeal, ctx.session.user.id, ctx.session.isAdmin)
  return { ...ctx, role }
}

export async function withAdvertiser(dealId: string) {
  const ctx = await withDealContext(dealId)
  requireAdvertiser(ctx.authDeal, ctx.session.user.id, ctx.session.isAdmin)
  return ctx
}

export async function withCreator(dealId: string) {
  const ctx = await withDealContext(dealId)
  requireCreator(ctx.authDeal, ctx.session.user.id, ctx.session.isAdmin)
  return ctx
}

export async function withAdmin() {
  const session = await requireAuthenticatedUser()
  requireAdmin(session.isAdmin)
  return session
}
