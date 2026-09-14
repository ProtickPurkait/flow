// Flow: self-serve business signup. Unlike admin-create-business (which
// only a Fenlark super admin can call), this is public -- a business owner
// signs up with their own chosen password and is live in their dashboard
// immediately. New businesses land as status='paused' (customer-facing
// pages/join stay gated on status='active' per the existing RLS/RPCs), so
// the owner can set everything up while Fenlark reviews and activates them
// from the admin panel -- no separate approval step blocks onboarding.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const businessName: string = (body.businessName ?? '').trim()
    const category: string | null = body.category || null
    const phone: string | null = body.phone || null
    const email: string = (body.email ?? '').trim().toLowerCase()
    const password: string = body.password ?? ''

    if (!businessName) {
      return new Response(JSON.stringify({ error: 'Business name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Enter a valid email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    let slug = slugify(businessName)
    const { data: existingSlug } = await admin.from('businesses').select('slug').eq('slug', slug).maybeSingle()
    if (existingSlug) slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: createdUser, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (userErr) {
      const message = userErr.message.toLowerCase().includes('already') ? 'An account with this email already exists' : userErr.message
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: business, error: businessErr } = await admin
      .from('businesses')
      .insert({
        name: businessName,
        slug,
        phone,
        category,
        status: 'paused',
        is_verified: false,
      })
      .select()
      .single()
    if (businessErr) {
      await admin.auth.admin.deleteUser(createdUser.user.id)
      throw businessErr
    }

    const { error: programErr } = await admin.from('stamp_programs').insert({
      business_id: business.id,
      name: 'Loyalty Card',
      stamps_required: 8,
      reward_description: 'Set your reward in the dashboard',
      is_active: true,
    })
    if (programErr) throw programErr

    const { error: staffErr } = await admin.from('business_staff').insert({
      business_id: business.id,
      user_id: createdUser.user.id,
      role: 'owner',
    })
    if (staffErr) throw staffErr

    const { error: qrErr } = await admin.from('qr_codes').insert({
      business_id: business.id,
      label: 'default',
    })
    if (qrErr) throw qrErr

    return new Response(JSON.stringify({ business }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
