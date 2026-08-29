import type {
  ContentMode,
  ContentStatus,
  PlacementStatus,
  TermsStatus,
} from '@/lib/deal-lifecycle'

export type Profile = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  description: string | null
  active_role: string
  subscription_plan: string
  is_admin: boolean
  is_founder: boolean
  level: string
  level_deals: number
  friends_count: number
  preferred_currency: CurrencyCode | null
  created_at: string
}

export type Channel = {
  id: string
  owner_id: string | null
  category_id: string | null
  name: string
  telegram_username: string
  description: string | null
  avatar_url: string | null
  subscriber_count: number
  avg_views: number
  engagement_rate: number
  language: string
  country: string
  ad_price: number | null
  ad_price_currency: string
  contact_telegram: string | null
  is_verified: boolean
  is_active: boolean
  verification_status: string
  platform: string
  platform_url: string | null
  telegram_chat_id: number | null
  analytics_status: string
  analytics_connected_at: string | null
  analytics_posts_tracked: number
  analytics_last_sync_at: string | null
  analytics_avg_views_24h: number | null
  analytics_err24_eligible_count: number
  created_at: string
}

export type TelegramPost = {
  id: string
  channel_id: string
  telegram_chat_id: number
  telegram_message_id: number
  published_at: string
  subscriber_count_at_publish: number | null
  views_at_ingest: number | null
  current_views: number | null
  last_analytics_update: string | null
  ad_request_id: string | null
  deal_price: number | null
  is_deleted: boolean
  edited_at: string | null
  created_at: string
}

export type TelegramPostSnapshot = {
  id: string
  post_id: string
  checkpoint: string
  scheduled_at: string
  captured_at: string | null
  subscriber_count: number | null
  views: number | null
  views_unavailable: boolean
  status: string
  created_at: string
}

export type AdRequest = {
  id: string
  channel_id: string | null
  campaign_id: string | null
  advertiser_id: string | null
  advertiser_name: string
  advertiser_contact: string
  advertiser_email: string | null
  message: string
  budget: number | null
  status: string
  proof_links: string[] | null
  creator_note: string | null
  advertiser_note: string | null
  accepted_at: string | null
  completed_at: string | null
  posts_count: number
  payment_status: string | null
  dispute_reason: string | null
  auto_completed: boolean | null
  platform_commission: number | null
  updated_at: string | null
  creator_viewed_at: string | null
  advertiser_viewed_at: string | null
  created_at: string
  /** Phase 0 lifecycle columns (deal-lifecycle-phase0.sql) */
  content_mode: ContentMode | null
  budget_currency: CurrencyCode | null
  final_price: number | null
  final_price_currency: CurrencyCode | null
  placements_count: number | null
  placement_start_at: string | null
  placement_end_at: string | null
  terms_status: TermsStatus
  final_terms: unknown | null
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
}

export type DealPlacement = {
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
  created_at: string
  updated_at: string
}

export type DealMaterialAttachment = {
  url?: string
  name?: string
  mime_type?: string
  size_bytes?: number
}

export type DealMaterial = {
  id: string
  ad_request_id: string
  body_text: string | null
  destination_url: string | null
  attachments: DealMaterialAttachment[] | unknown | null
  creator_submission_text: string | null
  change_request_comment: string | null
  created_at: string
  updated_at: string
}

export type Campaign = {
  id: string
  advertiser_id: string | null
  advertiser_email: string | null
  name: string
  description: string | null
  budget: number | null
  product_link: string | null
  target_audience: string | null
  preferred_date: string | null
  category: string
  min_subscribers: number
  requirements: string | null
  status: string
  slots_total: number
  slots_filled: number
  preferred_social_networks: string[] | null
  collection_deadline: string | null
  brief: string | null
  created_at: string
  advertiser_profile?: {
    full_name?: string | null
    avatar_url?: string | null
    subscription_plan?: string
    is_admin?: boolean
  } | null
}

export type Review = {
  id: string
  deal_id: string | null
  reviewer_id: string | null
  reviewee_id: string | null
  rating: number | null
  comment: string | null
  created_at: string
}

export type Message = {
  id: string
  deal_id: string | null
  sender_id: string | null
  content: string
  created_at: string
}

export type Friendship = {
  id: string
  requester_id: string | null
  addressee_id: string | null
  status: string
  created_at: string
}

export type DealStatus =
  | 'new'
  | 'payment_pending'
  | 'accepted'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'disputed'
  | 'resolved_creator'
  | 'resolved_advertiser'

export type CurrencyCode = 'USD' | 'EUR' | 'AMD' | 'GEL' | 'RUB'

export type UserRole = 'creator' | 'advertiser'

export type Platform = 'telegram' | 'youtube' | 'instagram' | 'tiktok'
