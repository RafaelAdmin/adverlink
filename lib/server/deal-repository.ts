import { createAdminClient } from '@/lib/supabase-admin'
import { DealActionError } from '@/lib/server/deal-errors'
import type { ContentMode, ContentStatus, DealLifecycleContext, TermsStatus } from '@/lib/deal-lifecycle'
import type { PlacementStatus } from '@/lib/deal-lifecycle'

export type DealRecord = {
  id: string
  status: string
  channel_id: string | null
  campaign_id: string | null
  advertiser_id: string | null
  advertiser_name: string
  budget: number | null
  message: string
  posts_count: number | null
  proof_links: string[] | null
  creator_note: string | null
  advertiser_note: string | null
  payment_status: string | null
  dispute_reason: string | null
  accepted_at: string | null
  completed_at: string | null
  updated_at: string | null
  created_at: string
  content_mode: ContentMode | null
  budget_currency: string | null
  final_price: number | null
  final_price_currency: string | null
  placements_count: number | null
  placement_start_at: string | null
  placement_end_at: string | null
  terms_status: TermsStatus
  final_terms: Record<string, unknown> | null
  final_terms_proposed_by: string | null
  final_terms_proposed_at: string | null
  final_terms_accepted_at: string | null
  terms_locked_at: string | null
  content_status: ContentStatus
  content_submitted_at: string | null
  content_approved_at: string | null
  all_placements_published_at: string | null
  final_review_started_at: string | null
  auto_complete_deadline: string | null
  channels: {
    owner_id: string
    telegram_username: string
    platform: string | null
  } | null
}

export type PlacementRecord = {
  id: string
  ad_request_id: string
  placement_index: number
  status: PlacementStatus
  scheduled_at: string | null
  published_at: string | null
  proof_url: string | null
  telegram_message_id: number | null
  telegram_post_id: string | null
  issue_reported_at: string | null
  issue_reported_by: string | null
  issue_comment: string | null
}

export type MaterialRecord = {
  id: string
  ad_request_id: string
  body_text: string | null
  destination_url: string | null
  attachments: unknown[] | null
  creator_submission_text: string | null
  change_request_comment: string | null
}

const DEAL_SELECT = `
  *,
  channels:channel_id (
    owner_id,
    telegram_username,
    platform
  )
`

export function getAdminClient() {
  return createAdminClient()
}

export async function loadDealForAction(dealId: string): Promise<DealRecord> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('ad_requests')
    .select(DEAL_SELECT)
    .eq('id', dealId)
    .maybeSingle()

  if (error) {
    throw new DealActionError('Failed to load deal', 500)
  }
  if (!data) {
    throw new DealActionError('Deal not found', 404)
  }

  const channelRaw = data.channels
  const channel = (Array.isArray(channelRaw) ? channelRaw[0] : channelRaw) as DealRecord['channels']

  return { ...data, channels: channel } as DealRecord
}

export async function loadPlacements(dealId: string): Promise<PlacementRecord[]> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('deal_placements')
    .select('*')
    .eq('ad_request_id', dealId)
    .order('placement_index', { ascending: true })

  if (error) {
    throw new DealActionError('Failed to load placements', 500)
  }

  return (data || []) as PlacementRecord[]
}

export async function loadMaterial(dealId: string): Promise<MaterialRecord | null> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('deal_materials')
    .select('*')
    .eq('ad_request_id', dealId)
    .maybeSingle()

  if (error) {
    throw new DealActionError('Failed to load deal material', 500)
  }

  return (data as MaterialRecord | null) ?? null
}

export function dealForAuth(deal: DealRecord) {
  return {
    id: deal.id,
    advertiser_id: deal.advertiser_id,
    channel_id: deal.channel_id,
    channel_owner_id: deal.channels?.owner_id ?? null,
  }
}

export function buildLifecycleContext(deal: DealRecord, placements: PlacementRecord[]): DealLifecycleContext {
  return {
    status: deal.status,
    termsStatus: deal.terms_status ?? 'none',
    contentMode: deal.content_mode,
    contentStatus: deal.content_status ?? 'not_required',
    placementsCount: deal.placements_count,
    placements: placements.map((p) => ({
      placementIndex: p.placement_index,
      status: p.status,
    })),
    allPlacementsPublishedAt: deal.all_placements_published_at,
    finalReviewStartedAt: deal.final_review_started_at,
    autoCompleteDeadline: deal.auto_complete_deadline,
    termsLockedAt: deal.terms_locked_at,
  }
}

export async function reloadDealBundle(dealId: string) {
  const deal = await loadDealForAction(dealId)
  const placements = await loadPlacements(dealId)
  const material = await loadMaterial(dealId)
  return {
    deal,
    placements,
    material,
    lifecycle: buildLifecycleContext(deal, placements),
  }
}
