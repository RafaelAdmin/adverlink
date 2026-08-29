import { requireAuth } from '@/lib/api-auth'
import { DealActionError } from '@/lib/server/deal-errors'
import type { User } from '@supabase/supabase-js'

export type DealParticipantRole = 'advertiser' | 'creator'

export type DealForAuth = {
  id: string
  advertiser_id: string | null
  channel_id: string | null
  channel_owner_id: string | null
}

export type AuthenticatedDealSession = {
  user: User
  isAdmin: boolean
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedDealSession> {
  const session = await requireAuth()
  if (!session) {
    throw new DealActionError('Unauthorized', 401)
  }

  const { data: profile } = await session.supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .maybeSingle()

  return {
    user: session.user,
    isAdmin: !!profile?.is_admin,
  }
}

export function getParticipantRole(deal: DealForAuth, userId: string): DealParticipantRole | null {
  if (deal.advertiser_id === userId) return 'advertiser'
  if (deal.channel_owner_id === userId) return 'creator'
  return null
}

export function requireDealParticipant(
  deal: DealForAuth,
  userId: string,
  isAdmin: boolean,
): DealParticipantRole {
  if (isAdmin) {
    const role = getParticipantRole(deal, userId)
    if (role) return role
    throw new DealActionError('Admin must act through dedicated admin endpoints', 403)
  }

  const role = getParticipantRole(deal, userId)
  if (!role) {
    throw new DealActionError('Forbidden', 403)
  }
  return role
}

export function requireAdvertiser(deal: DealForAuth, userId: string, isAdmin: boolean): void {
  if (isAdmin) return
  if (deal.advertiser_id !== userId) {
    throw new DealActionError('Advertiser only', 403)
  }
}

export function requireCreator(deal: DealForAuth, userId: string, isAdmin: boolean): void {
  if (isAdmin) return
  if (deal.channel_owner_id !== userId) {
    throw new DealActionError('Creator only', 403)
  }
}

export function requireAdmin(isAdmin: boolean): void {
  if (!isAdmin) {
    throw new DealActionError('Admin only', 403)
  }
}
