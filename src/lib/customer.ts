import { supabase } from '@/lib/supabase'
import type {
  JoinBusinessResult,
  ExploreBusinessRow,
  MyCardRow,
  MyRewardRow,
  CustomerProfile,
} from '@/types/database'

// Ensures this browser has an anonymous Supabase Auth session. No OTP, no
// password, invisible to the customer -- this is purely the RLS/Realtime
// security boundary behind the phone-capture UX described in the product spec.
export async function ensureCustomerSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session

  const { data: signInData, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signInData.session
}

export async function isRegistered(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_registered')
  if (error) throw error
  return Boolean(data)
}

export async function registerCustomer(phone: string, name: string) {
  const { data, error } = await supabase.rpc('register_customer', {
    p_phone: phone,
    p_name: name,
  })
  if (error) throw error
  return data?.[0]
}

export async function joinBusiness(slug: string): Promise<JoinBusinessResult> {
  const { data, error } = await supabase.rpc('join_business', { p_business_slug: slug })
  if (error) throw error
  if (!data?.[0]) throw new Error('Could not join business')
  return data[0]
}

export async function requestStamp(slug: string) {
  const { data, error } = await supabase.rpc('request_stamp', { p_business_slug: slug })
  if (error) throw error
  return data
}

export async function logEngagementClick(membershipId: string, type: 'google_review' | 'instagram_follow') {
  const { error } = await supabase.from('engagement_clicks').insert({ membership_id: membershipId, type })
  if (error) throw error
}

export async function exploreBusinesses(opts: {
  query?: string
  category?: string
  lat?: number
  lng?: number
}): Promise<ExploreBusinessRow[]> {
  const { data, error } = await supabase.rpc('explore_businesses', {
    p_query: opts.query || null,
    p_category: opts.category || null,
    p_lat: opts.lat ?? null,
    p_lng: opts.lng ?? null,
  })
  if (error) throw error
  return data ?? []
}

export async function listMyCards(): Promise<MyCardRow[]> {
  const { data, error } = await supabase.rpc('list_my_cards')
  if (error) throw error
  return data ?? []
}

export async function listMyRewards(): Promise<MyRewardRow[]> {
  const { data, error } = await supabase.rpc('list_my_rewards')
  if (error) throw error
  return data ?? []
}

export async function updateMyProfile(name: string, email: string): Promise<CustomerProfile | undefined> {
  const { data, error } = await supabase.rpc('update_my_profile', { p_name: name, p_email: email })
  if (error) throw error
  return data?.[0]
}

export async function getMyProfile(): Promise<CustomerProfile | undefined> {
  const { data, error } = await supabase.rpc('get_my_profile')
  if (error) throw error
  return data?.[0]
}

export async function signOutCustomer() {
  await supabase.auth.signOut()
}
