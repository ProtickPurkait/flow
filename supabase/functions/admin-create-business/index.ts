// Fenlark Super Admin: onboard a new business tenant.
// Runs with the service-role key (server-side only) because creating a staff
// auth user for someone else cannot be done safely from the browser.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

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

function randomPassword() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await callerClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: isAdmin } = await admin
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const name: string = body.name
    const ownerEmail: string = body.ownerEmail
    const stampsRequired: number = Number(body.stampsRequired) || 8
    const rewardDescription: string = body.rewardDescription || 'A free reward'

    if (!name || !ownerEmail) {
      return new Response(JSON.stringify({ error: 'name and ownerEmail are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let slug = slugify(name)
    const { data: existing } = await admin.from('businesses').select('slug').eq('slug', slug).maybeSingle()
    if (existing) slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: business, error: businessErr } = await admin
      .from('businesses')
      .insert({
        name,
        slug,
        phone: body.phone ?? null,
        address: body.address ?? null,
        google_review_url: body.googleReviewUrl ?? null,
        instagram_handle: body.instagramHandle ?? null,
        category: body.category ?? null,
        latitude: body.latitude ? Number(body.latitude) : null,
        longitude: body.longitude ? Number(body.longitude) : null,
        is_verified: Boolean(body.isVerified),
      })
      .select()
      .single()
    if (businessErr) throw businessErr

    const { error: programErr } = await admin.from('stamp_programs').insert({
      business_id: business.id,
      name: 'Loyalty Card',
      stamps_required: stampsRequired,
      reward_description: rewardDescription,
      is_active: true,
    })
    if (programErr) throw programErr

    const temporaryPassword = randomPassword()
    const { data: createdUser, error: userErr } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: temporaryPassword,
      email_confirm: true,
    })
    if (userErr) throw userErr

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

    return new Response(
      JSON.stringify({
        business,
        staff: { email: ownerEmail, temporaryPassword },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
