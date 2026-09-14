-- Flow: per-business WhatsApp provider credentials, so each business (or
-- Fenlark on their behalf) can plug in their own WhatsApp Business API
-- account -- one business on Meta Cloud API today, another on Twilio or
-- Gupshup tomorrow -- entirely from the dashboard, no code changes or
-- redeploys. send-whatsapp reads this table per-business at send time.

create table whatsapp_configs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references businesses(id) on delete cascade,
  provider text not null default 'meta_cloud' check (provider in ('meta_cloud', 'twilio', 'gupshup')),
  credentials jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table whatsapp_configs enable row level security;

-- Credentials are secrets: only that business's own staff may read or write
-- their row. No public policy -- unlike scratch_prizes/menu_items, nothing
-- here is ever customer-facing.
create policy whatsapp_configs_select on whatsapp_configs
  for select using (is_staff_of(business_id));

create policy whatsapp_configs_insert on whatsapp_configs
  for insert with check (is_staff_of(business_id));

create policy whatsapp_configs_update on whatsapp_configs
  for update using (is_staff_of(business_id)) with check (is_staff_of(business_id));

create policy whatsapp_configs_delete on whatsapp_configs
  for delete using (is_staff_of(business_id));
