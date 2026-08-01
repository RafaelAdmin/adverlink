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
  created_at: string
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
