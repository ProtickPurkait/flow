-- Flow: Row Level Security. Every table has RLS enabled; tables with no
-- policy listed are fully locked to direct client access and are only ever
-- touched through SECURITY DEFINER functions (see 0004_rpc.sql).

alter table businesses enable row level security;
alter table super_admins enable row level security;
alter table business_staff enable row level security;
alter table stamp_programs enable row level security;
alter table customers enable row level security;
alter table customer_auth_links enable row level security;
alter table memberships enable row level security;
alter table stamp_events enable row level security;
alter table reward_redemptions enable row level security;
alter table engagement_clicks enable row level security;
alter table qr_codes enable row level security;

-- businesses: publicly readable when active; staff/super-admin see their own regardless.
create policy businesses_select on businesses
  for select using (status = 'active' or is_staff_of(id) or is_super_admin());

create policy businesses_update on businesses
  for update using (is_staff_of(id)) with check (is_staff_of(id));

-- super_admins: fully locked (checked only via is_super_admin()).

-- business_staff: a staff member can only see their own row(s).
create policy business_staff_select on business_staff
  for select using (user_id = auth.uid());

-- stamp_programs: publicly readable while active; staff manage their own business's programs.
create policy stamp_programs_select on stamp_programs
  for select using (is_active or is_staff_of(business_id));

create policy stamp_programs_insert on stamp_programs
  for insert with check (is_staff_of(business_id));

create policy stamp_programs_update on stamp_programs
  for update using (is_staff_of(business_id)) with check (is_staff_of(business_id));

-- qr_codes: publicly readable (per spec), staff manage their own.
create policy qr_codes_select on qr_codes
  for select using (true);

create policy qr_codes_insert on qr_codes
  for insert with check (is_staff_of(business_id));

create policy qr_codes_delete on qr_codes
  for delete using (is_staff_of(business_id));

-- customers: no policies -- always accessed via SECURITY DEFINER RPCs.

-- customer_auth_links: no policies -- always accessed via SECURITY DEFINER RPCs.

-- memberships: customer reads their own; staff read/manage their business's.
create policy memberships_select on memberships
  for select using (customer_id = current_customer_id() or is_staff_of(business_id));

-- stamp_events: customer reads their own; staff read + approve/reject for their business.
create policy stamp_events_select on stamp_events
  for select using (
    is_staff_of(business_id)
    or membership_id in (select id from memberships where customer_id = current_customer_id())
  );

create policy stamp_events_update on stamp_events
  for update using (is_staff_of(business_id))
  with check (is_staff_of(business_id) and status in ('approved', 'rejected'));

-- reward_redemptions: customer reads their own; staff read + mark redeemed.
create policy reward_redemptions_select on reward_redemptions
  for select using (
    is_staff_of(business_id)
    or membership_id in (select id from memberships where customer_id = current_customer_id())
  );

create policy reward_redemptions_update on reward_redemptions
  for update using (is_staff_of(business_id)) with check (is_staff_of(business_id));

-- engagement_clicks: customer logs their own clicks; staff read for their business.
create policy engagement_clicks_insert on engagement_clicks
  for insert with check (
    membership_id in (select id from memberships where customer_id = current_customer_id())
  );

create policy engagement_clicks_select on engagement_clicks
  for select using (
    exists (
      select 1 from memberships m
      where m.id = engagement_clicks.membership_id and is_staff_of(m.business_id)
    )
  );
