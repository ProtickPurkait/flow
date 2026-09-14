export type StampEventStatus = 'pending' | 'approved' | 'rejected'
export type BusinessStatus = 'active' | 'paused'
export type StaffRole = 'owner' | 'staff'
export type EngagementType = 'google_review' | 'instagram_follow'

export interface Business {
  id: string
  name: string
  slug: string
  logo_url: string | null
  brand_color: string
  address: string | null
  phone: string | null
  email: string | null
  google_review_url: string | null
  instagram_handle: string | null
  status: BusinessStatus
  category: string | null
  latitude: number | null
  longitude: number | null
  is_verified: boolean
  auto_approve_scans: boolean
  allow_multiple_scans_per_day: boolean
  hours: string | null
  created_at: string
}

export interface BusinessStaff {
  id: string
  business_id: string
  user_id: string
  role: StaffRole
  created_at: string
}

export interface StampProgram {
  id: string
  business_id: string
  name: string
  stamps_required: number
  reward_description: string
  reward_expiry_days: number
  minimum_order_value: number
  collection_deadline_enabled: boolean
  collection_deadline_days: number
  welcome_message_template: string
  deadline_reminder_template: string
  card_expired_template: string
  is_active: boolean
  created_at: string
}

export interface Membership {
  id: string
  customer_id: string
  business_id: string
  program_id: string | null
  current_stamps: number
  total_rewards_redeemed: number
  joined_at: string
  last_visit_at: string | null
  current_cycle_started_at: string | null
  collection_deadline_at: string | null
}

export interface StampEvent {
  id: string
  membership_id: string
  business_id: string
  status: StampEventStatus
  approved_by: string | null
  order_amount: number | null
  created_at: string
  approved_at: string | null
}

export interface RewardRedemption {
  id: string
  membership_id: string
  business_id: string
  program_id: string | null
  redemption_code: string | null
  redeemed_at: string | null
  created_at: string
}

export interface QrCode {
  id: string
  business_id: string
  label: string
  created_at: string
}

export type WhatsappProvider = 'meta_cloud' | 'twilio' | 'gupshup'

export interface WhatsappConfig {
  id: string
  business_id: string
  provider: WhatsappProvider
  credentials: Record<string, string>
  is_active: boolean
  updated_at: string
}

export interface ScratchPrize {
  id: string
  business_id: string
  title: string
  image_url: string | null
  win_numerator: number
  win_denominator: number
  expiry_days: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ScratchDraw {
  id: string
  customer_id: string
  business_id: string
  prize_id: string | null
  prize_title: string | null
  won: boolean
  claimed_at: string | null
  expires_at: string | null
  created_at: string
}

export interface MenuCategory {
  id: string
  business_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface MenuItem {
  id: string
  business_id: string
  category_id: string
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  is_available: boolean
  sort_order: number
  created_at: string
}

export interface JoinBusinessResult {
  membership_id: string
  business_id: string
  business_name: string
  brand_color: string
  logo_url: string | null
  google_review_url: string | null
  instagram_handle: string | null
  program_id: string | null
  program_name: string | null
  stamps_required: number | null
  reward_description: string | null
  minimum_order_value: number
  current_stamps: number
  total_rewards_redeemed: number
  collection_deadline_at: string | null
}

export interface BusinessCustomerRow {
  customer_id: string
  name: string | null
  phone: string
  current_stamps: number
  stamps_required: number | null
  total_rewards_redeemed: number
  joined_at: string
  last_visit_at: string | null
  collection_deadline_at: string | null
}

export interface PendingStampRequestRow {
  stamp_event_id: string
  membership_id: string
  customer_name: string | null
  customer_phone: string
  current_stamps: number
  stamps_required: number | null
  minimum_order_value: number
  requested_at: string
}

export interface PendingRedemptionRow {
  redemption_id: string
  membership_id: string
  customer_name: string | null
  customer_phone: string
  redemption_code: string | null
  unlocked_at: string
}

export interface ExploreBusinessRow {
  id: string
  name: string
  slug: string
  logo_url: string | null
  category: string | null
  address: string | null
  is_verified: boolean
  reward_description: string | null
  distance_km: number | null
}

export interface MyCardRow {
  membership_id: string
  business_id: string
  business_name: string
  business_slug: string
  logo_url: string | null
  category: string | null
  current_stamps: number
  stamps_required: number | null
  reward_description: string | null
  last_visit_at: string | null
  collection_deadline_at: string | null
}

export interface WhatsappNotificationRow {
  id: string
  customer_name: string | null
  customer_phone: string
  type: 'welcome' | 'deadline_reminder' | 'card_expired' | 'promo'
  message_body: string
  status: 'pending' | 'sent' | 'failed' | 'skipped_not_configured'
  created_at: string
  sent_at: string | null
}

export interface MyRewardRow {
  redemption_id: string
  business_name: string
  business_slug: string
  logo_url: string | null
  reward_description: string | null
  redemption_code: string | null
  unlocked_at: string
  redeemed_at: string | null
}

export interface CustomerProfile {
  id: string
  phone: string
  name: string | null
  email: string | null
}

export interface PendingScratchWinRow {
  draw_id: string
  customer_name: string | null
  customer_phone: string
  prize_title: string | null
  won_at: string
  expires_at: string | null
}

export interface ClaimedScratchWinRow {
  draw_id: string
  customer_name: string | null
  customer_phone: string
  prize_title: string | null
  won_at: string
  claimed_at: string
}

export interface ClaimedRedemptionRow {
  redemption_id: string
  customer_name: string | null
  customer_phone: string
  redemption_code: string | null
  redeemed_at: string
}

export interface BusinessStatsRow {
  scans_today: number
  total_customers: number
  rewards_redeemed: number
  repeat_rate: number
}

export interface DailyCountRow {
  day: string
  scans?: number
  total_customers?: number
}

export interface ScratchDrawResult {
  draw_id: string
  won: boolean
  prize_title: string | null
  expires_at: string | null
}

export interface Database {
  public: {
    Tables: {
      businesses: { Row: Business; Insert: Partial<Business>; Update: Partial<Business> }
      business_staff: { Row: BusinessStaff; Insert: Partial<BusinessStaff>; Update: Partial<BusinessStaff> }
      stamp_programs: { Row: StampProgram; Insert: Partial<StampProgram>; Update: Partial<StampProgram> }
      memberships: { Row: Membership; Insert: Partial<Membership>; Update: Partial<Membership> }
      stamp_events: { Row: StampEvent; Insert: Partial<StampEvent>; Update: Partial<StampEvent> }
      reward_redemptions: {
        Row: RewardRedemption
        Insert: Partial<RewardRedemption>
        Update: Partial<RewardRedemption>
      }
      qr_codes: { Row: QrCode; Insert: Partial<QrCode>; Update: Partial<QrCode> }
      scratch_prizes: { Row: ScratchPrize; Insert: Partial<ScratchPrize>; Update: Partial<ScratchPrize> }
      scratch_draws: { Row: ScratchDraw; Insert: Partial<ScratchDraw>; Update: Partial<ScratchDraw> }
      menu_categories: { Row: MenuCategory; Insert: Partial<MenuCategory>; Update: Partial<MenuCategory> }
      menu_items: { Row: MenuItem; Insert: Partial<MenuItem>; Update: Partial<MenuItem> }
      whatsapp_configs: { Row: WhatsappConfig; Insert: Partial<WhatsappConfig>; Update: Partial<WhatsappConfig> }
    }
    Views: Record<string, never>
    Functions: {
      register_customer: {
        Args: { p_phone: string; p_name?: string | null }
        Returns: { id: string; phone: string; name: string | null; customer_token: string }[]
      }
      join_business: {
        Args: { p_business_slug: string }
        Returns: JoinBusinessResult[]
      }
      is_registered: { Args: Record<string, never>; Returns: boolean }
      request_stamp: { Args: { p_business_slug: string }; Returns: StampEvent }
      list_business_customers: { Args: { p_business_id: string }; Returns: BusinessCustomerRow[] }
      list_pending_stamp_requests: { Args: { p_business_id: string }; Returns: PendingStampRequestRow[] }
      list_pending_redemptions: { Args: { p_business_id: string }; Returns: PendingRedemptionRow[] }
      is_super_admin: { Args: Record<string, never>; Returns: boolean }
      explore_businesses: {
        Args: { p_query?: string | null; p_category?: string | null; p_lat?: number | null; p_lng?: number | null }
        Returns: ExploreBusinessRow[]
      }
      list_my_cards: { Args: Record<string, never>; Returns: MyCardRow[] }
      list_my_rewards: { Args: Record<string, never>; Returns: MyRewardRow[] }
      update_my_profile: { Args: { p_name: string | null; p_email: string | null }; Returns: CustomerProfile[] }
      get_my_profile: { Args: Record<string, never>; Returns: CustomerProfile[] }
      draw_scratch_card: { Args: { p_business_slug: string }; Returns: ScratchDrawResult[] }
      list_pending_scratch_wins: { Args: { p_business_id: string }; Returns: PendingScratchWinRow[] }
      list_claimed_scratch_wins: { Args: { p_business_id: string }; Returns: ClaimedScratchWinRow[] }
      claim_scratch_win: { Args: { p_draw_id: string }; Returns: ScratchDraw }
      list_claimed_redemptions: { Args: { p_business_id: string }; Returns: ClaimedRedemptionRow[] }
      get_business_stats: { Args: { p_business_id: string }; Returns: BusinessStatsRow[] }
      get_weekly_scans: { Args: { p_business_id: string }; Returns: DailyCountRow[] }
      get_customer_growth: { Args: { p_business_id: string }; Returns: DailyCountRow[] }
      send_promo_message: { Args: { p_business_id: string; p_message: string }; Returns: number }
      list_whatsapp_notifications: { Args: { p_business_id: string; p_limit?: number }; Returns: WhatsappNotificationRow[] }
    }
  }
}
