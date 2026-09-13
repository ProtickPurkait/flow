// Fenlark Super Admin: reset a staff member's password.
// Runs with the service-role key (server-side only) -- resetting someone
// else's password cannot be done safely from the browser.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const businessId: string | undefined = body.businessId
    let staffUserId: string | undefined = body.userId

    if (!staffUserId && !businessId) {
      return new Response(JSON.stringify({ error: 'userId or businessId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!staffUserId && businessId) {
      const { data: staff, error: staffErr } = await admin
        .from('business_staff')
        .select('user_id')
        .eq('business_id', businessId)
        .eq('role', 'owner')
        .maybeSingle()
      if (staffErr) throw staffErr
      if (!staff) {
        return new Response(JSON.stringify({ error: 'no owner account found for this business' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      staffUserId = staff.user_id
    }

    const temporaryPassword = randomPassword()
    const { data: updatedUser, error: updateErr } = await admin.auth.admin.updateUserById(staffUserId, {
      password: temporaryPassword,
    })
    if (updateErr) throw updateErr

    return new Response(
      JSON.stringify({
        email: updatedUser.user.email,
        temporaryPassword,
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
