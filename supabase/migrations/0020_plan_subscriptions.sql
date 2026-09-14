-- Flow: lay down a plan/subscription model now, while there's one paying
-- client, rather than retrofitting it once there are several. Nothing here
-- is enforced yet -- no feature gate reads these columns -- this just gives
-- Fenlark a place to record what each business is on and stops a schema
-- migration from being the blocker when billing actually needs wiring up.

alter table businesses add column plan text not null default 'starter'
  check (plan in ('starter', 'growth', 'automated'));

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references businesses(id) on delete cascade,
  plan text not null check (plan in ('starter', 'growth', 'automated')),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- Staff can see their own business's subscription; only Fenlark super
-- admins can create or change one -- this is admin-recorded, not
-- self-serve, until real billing exists.
create policy subscriptions_select on subscriptions
  for select using (is_staff_of(business_id) or is_super_admin());

create policy subscriptions_insert on subscriptions
  for insert with check (is_super_admin());

create policy subscriptions_update on subscriptions
  for update using (is_super_admin()) with check (is_super_admin());

create policy subscriptions_delete on subscriptions
  for delete using (is_super_admin());
