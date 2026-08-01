import type { Campaign } from '@/lib/database.types'

export type CampaignStatus =
  | 'draft'
  | 'collecting'
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export const SOCIAL_NETWORK_OPTIONS = [
  { value: 'telegram', label: 'Telegram', icon: 'ti-brand-telegram' },
  { value: 'youtube', label: 'YouTube', icon: 'ti-brand-youtube' },
  { value: 'instagram', label: 'Instagram', icon: 'ti-brand-instagram' },
  { value: 'tiktok', label: 'TikTok', icon: 'ti-brand-tiktok' },
] as const

export function normalizeCampaignStatus(status: string): CampaignStatus {
  if (status === 'active') return 'collecting'
  return status as CampaignStatus
}

export function isCampaignCollecting(campaign: Pick<Campaign, 'status' | 'collection_deadline' | 'slots_total' | 'slots_filled'>) {
  const status = normalizeCampaignStatus(campaign.status)
  if (!['collecting', 'active'].includes(status)) return false
  if (campaign.slots_filled >= campaign.slots_total) return false
  if (campaign.collection_deadline) {
    return new Date(campaign.collection_deadline) > new Date()
  }
  return true
}

export function getSlotsLabel(campaign: Pick<Campaign, 'slots_filled' | 'slots_total'>) {
  return `${campaign.slots_filled}/${campaign.slots_total} каналов`
}

export function getCampaignStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Черновик',
    collecting: 'Сбор заявок',
    active: 'Сбор заявок',
    in_progress: 'В работе',
    completed: 'Завершена',
    cancelled: 'Отменена',
  }
  return map[normalizeCampaignStatus(status)] || status
}

export async function incrementCampaignSlots(
  supabase: ReturnType<typeof import('@/lib/supabase').createClient>,
  campaignId: string,
) {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('slots_total, slots_filled, status')
    .eq('id', campaignId)
    .single()

  if (!campaign) return

  const newFilled = (campaign.slots_filled || 0) + 1
  const patch: Record<string, unknown> = { slots_filled: newFilled }

  if (newFilled >= (campaign.slots_total || 1)) {
    patch.status = 'in_progress'
  }

  await supabase.from('campaigns').update(patch).eq('id', campaignId)
}
