// Flow: drains the whatsapp_notifications queue built by the
// process_stamp_deadlines() sweep, join_business() welcome message, and
// send_promo_message(). Each business configures its own WhatsApp provider
// and credentials from the dashboard (Settings -> WhatsApp Business API,
// stored in whatsapp_configs) -- this function looks up that row per
// business at send time and dispatches through whichever provider is
// configured, so one business can be on Meta Cloud API while another is on
// Twilio or Gupshup, and switching providers needs no redeploy.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type WhatsappProvider = 'meta_cloud' | 'twilio' | 'gupshup'

interface WhatsappConfigRow {
  provider: WhatsappProvider
  credentials: Record<string, string>
  is_active: boolean
}

interface PendingNotification {
  id: string
  business_id: string
  message_body: string
  customers: { phone: string } | null
}

// Indian numbers are captured as a bare 10-digit local number (no country
// code) at registration -- see registerCustomer/PhoneCapturePrompt. Every
// provider needs the full international number, so normalize here rather
// than at every call site.
function toInternational(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

async function sendViaMetaCloud(phone: string, message: string, credentials: Record<string, string>) {
  const { phone_number_id, access_token } = credentials
  if (!phone_number_id || !access_token) throw new Error('not_configured')
  const res = await fetch(`https://graph.facebook.com/v20.0/${phone_number_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toInternational(phone),
      type: 'text',
      text: { body: message },
    }),
  })
  if (!res.ok) throw new Error(`meta_cloud: ${res.status} ${await res.text()}`)
}

async function sendViaTwilio(phone: string, message: string, credentials: Record<string, string>) {
  const { account_sid, auth_token, from_number } = credentials
  if (!account_sid || !auth_token || !from_number) throw new Error('not_configured')
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${account_sid}:${auth_token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: `whatsapp:${from_number}`,
      To: `whatsapp:+${toInternational(phone)}`,
      Body: message,
    }),
  })
  if (!res.ok) throw new Error(`twilio: ${res.status} ${await res.text()}`)
}

async function sendViaGupshup(phone: string, message: string, credentials: Record<string, string>) {
  const { api_key, source_number, app_name } = credentials
  if (!api_key || !source_number || !app_name) throw new Error('not_configured')
  const res = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
    method: 'POST',
    headers: { apikey: api_key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      channel: 'whatsapp',
      source: source_number,
      destination: toInternational(phone),
      'src.name': app_name,
      message: JSON.stringify({ type: 'text', text: message }),
    }),
  })
  if (!res.ok) throw new Error(`gupshup: ${res.status} ${await res.text()}`)
}

async function sendViaProvider(config: WhatsappConfigRow, phone: string, message: string): Promise<void> {
  switch (config.provider) {
    case 'meta_cloud':
      return sendViaMetaCloud(phone, message, config.credentials)
    case 'twilio':
      return sendViaTwilio(phone, message, config.credentials)
    case 'gupshup':
      return sendViaGupshup(phone, message, config.credentials)
    default:
      throw new Error(`unrecognized provider: ${config.provider}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: pending, error: fetchErr } = await admin
      .from('whatsapp_notifications')
      .select('id, business_id, message_body, customers(phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50)
    if (fetchErr) throw fetchErr

    const rows = (pending ?? []) as unknown as PendingNotification[]

    const businessIds = [...new Set(rows.map((r) => r.business_id))]
    const configByBusiness = new Map<string, WhatsappConfigRow | null>()
    if (businessIds.length > 0) {
      const { data: configs, error: configErr } = await admin
        .from('whatsapp_configs')
        .select('business_id, provider, credentials, is_active')
        .in('business_id', businessIds)
      if (configErr) throw configErr
      for (const c of configs ?? []) configByBusiness.set(c.business_id, c)
    }

    let sent = 0
    let failed = 0
    let skipped = 0

    for (const row of rows) {
      const phone = row.customers?.phone
      if (!phone) {
        await admin.from('whatsapp_notifications').update({ status: 'failed', error: 'customer has no phone on file' }).eq('id', row.id)
        failed++
        continue
      }

      const config = configByBusiness.get(row.business_id)
      if (!config || !config.is_active) {
        await admin
          .from('whatsapp_notifications')
          .update({ status: 'skipped_not_configured', error: 'no active WhatsApp provider configured for this business' })
          .eq('id', row.id)
        skipped++
        continue
      }

      try {
        await sendViaProvider(config, phone, row.message_body)
        await admin.from('whatsapp_notifications').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id)
        sent++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error'
        if (message === 'not_configured') {
          await admin.from('whatsapp_notifications').update({ status: 'skipped_not_configured', error: message }).eq('id', row.id)
          skipped++
        } else {
          await admin.from('whatsapp_notifications').update({ status: 'failed', error: message }).eq('id', row.id)
          failed++
        }
      }
    }

    return new Response(JSON.stringify({ processed: rows.length, sent, failed, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
