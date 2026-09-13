-- Flow: Scratch Cards, Digital Menu, and business-level scan settings --
-- replicating Druto's "Create Offer" surface (Stamp Card / Scratch Card /
-- Digital Menu) plus its Auto Approve Scans / Allow Multiple Scans toggles.

alter table businesses add column auto_approve_scans boolean not null default false;
alter table businesses add column allow_multiple_scans_per_day boolean not null default false;
alter table businesses add column hours text;

-- Scratch Cards: business-configured prizes with independent per-scan odds
-- ("1 winner out of 10 scans" = 10% chance, per prize, every draw).
create table scratch_prizes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  title text not null,
  image_url text,
  win_numerator int not null default 1 check (win_numerator > 0),
  win_denominator int not null default 10 check (win_denominator >= win_numerator),
  expiry_days int not null default 30 check (expiry_days > 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on scratch_prizes(business_id);

-- One row per customer scratch attempt (one per QR scan on the scratch flow).
create table scratch_draws (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  prize_id uuid references scratch_prizes(id) on delete set null,
  prize_title text,
  won boolean not null,
  claimed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index on scratch_draws(business_id, won, claimed_at);
create index on scratch_draws(customer_id, business_id);

-- Digital Menu: manual category/item builder (Druto also offers AI/Excel
-- import -- out of scope, no equivalent infra in Flow).
create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on menu_categories(business_id, sort_order);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2),
  image_url text,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on menu_items(category_id, sort_order);
create index on menu_items(business_id);

alter table scratch_prizes enable row level security;
alter table scratch_draws enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;

-- scratch_prizes: publicly readable while active (customer draw flow reads
-- odds), staff manage their own business's prizes.
create policy scratch_prizes_select on scratch_prizes
  for select using (is_active or is_staff_of(business_id));

create policy scratch_prizes_insert on scratch_prizes
  for insert with check (is_staff_of(business_id));

create policy scratch_prizes_update on scratch_prizes
  for update using (is_staff_of(business_id)) with check (is_staff_of(business_id));

create policy scratch_prizes_delete on scratch_prizes
  for delete using (is_staff_of(business_id));

-- scratch_draws: no direct client policies -- always via SECURITY DEFINER
-- RPCs (draw_scratch_card, claim_scratch_win, list_*).

-- menu_categories / menu_items: publicly readable (customer-facing digital
-- menu), staff manage their own business's menu.
create policy menu_categories_select on menu_categories for select using (true);
create policy menu_categories_insert on menu_categories for insert with check (is_staff_of(business_id));
create policy menu_categories_update on menu_categories for update using (is_staff_of(business_id)) with check (is_staff_of(business_id));
create policy menu_categories_delete on menu_categories for delete using (is_staff_of(business_id));

create policy menu_items_select on menu_items for select using (true);
create policy menu_items_insert on menu_items for insert with check (is_staff_of(business_id));
create policy menu_items_update on menu_items for update using (is_staff_of(business_id)) with check (is_staff_of(business_id));
create policy menu_items_delete on menu_items for delete using (is_staff_of(business_id));

alter publication supabase_realtime add table scratch_draws;

-- Customer: draw a scratch card for a business (one attempt per call, same
-- "membership required" gate as request_stamp).
create or replace function draw_scratch_card(p_business_slug text)
returns table (draw_id uuid, won boolean, prize_title text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_business businesses%rowtype;
  v_prize scratch_prizes%rowtype;
  v_won boolean := false;
  v_expires timestamptz;
  v_draw_id uuid;
begin
  v_customer_id := current_customer_id();
  if v_customer_id is null then
    raise exception 'not registered';
  end if;

  select * into v_business from businesses where slug = p_business_slug and status = 'active';
  if not found then
    raise exception 'business not found';
  end if;

  if not exists (
    select 1 from memberships where customer_id = v_customer_id and business_id = v_business.id
  ) then
    raise exception 'not a member of this business';
  end if;

  for v_prize in
    select * from scratch_prizes
    where scratch_prizes.business_id = v_business.id and scratch_prizes.is_active
    order by scratch_prizes.sort_order asc
  loop
    if random() < (v_prize.win_numerator::numeric / v_prize.win_denominator::numeric) then
      v_won := true;
      v_expires := now() + (v_prize.expiry_days || ' days')::interval;
      insert into scratch_draws (customer_id, business_id, prize_id, prize_title, won, expires_at)
      values (v_customer_id, v_business.id, v_prize.id, v_prize.title, true, v_expires)
      returning id into v_draw_id;
      return query select v_draw_id, true, v_prize.title, v_expires;
      return;
    end if;
  end loop;

  insert into scratch_draws (customer_id, business_id, won)
  values (v_customer_id, v_business.id, false)
  returning id into v_draw_id;
  return query select v_draw_id, false, null::text, null::timestamptz;
end;
$$;

grant execute on function draw_scratch_card(text) to anon, authenticated;

-- Staff: scratch wins awaiting in-person claim.
create or replace function list_pending_scratch_wins(p_business_id uuid)
returns table (
  draw_id uuid,
  customer_name text,
  customer_phone text,
  prize_title text,
  won_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff_of(p_business_id) then
    raise exception 'not authorized';
  end if;

  return query
    select sd.id, c.name, c.phone, sd.prize_title, sd.created_at, sd.expires_at
    from scratch_draws sd
    join customers c on c.id = sd.customer_id
    where sd.business_id = p_business_id and sd.won and sd.claimed_at is null
    order by sd.created_at asc;
end;
$$;

grant execute on function list_pending_scratch_wins(uuid) to authenticated;

-- Staff: claimed scratch win history.
create or replace function list_claimed_scratch_wins(p_business_id uuid)
returns table (
  draw_id uuid,
  customer_name text,
  customer_phone text,
  prize_title text,
  won_at timestamptz,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff_of(p_business_id) then
    raise exception 'not authorized';
  end if;

  return query
    select sd.id, c.name, c.phone, sd.prize_title, sd.created_at, sd.claimed_at
    from scratch_draws sd
    join customers c on c.id = sd.customer_id
    where sd.business_id = p_business_id and sd.won and sd.claimed_at is not null
    order by sd.claimed_at desc;
end;
$$;

grant execute on function list_claimed_scratch_wins(uuid) to authenticated;

-- Staff: mark a scratch win as claimed in person.
create or replace function claim_scratch_win(p_draw_id uuid)
returns scratch_draws
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draw scratch_draws%rowtype;
begin
  select * into v_draw from scratch_draws where id = p_draw_id;
  if not found then
    raise exception 'draw not found';
  end if;
  if not is_staff_of(v_draw.business_id) then
    raise exception 'not authorized';
  end if;

  update scratch_draws set claimed_at = now() where id = p_draw_id
  returning * into v_draw;

  return v_draw;
end;
$$;

grant execute on function claim_scratch_win(uuid) to authenticated;

-- Staff: claimed stamp-reward history (Winners > Stamp Cards tab).
create or replace function list_claimed_redemptions(p_business_id uuid)
returns table (
  redemption_id uuid,
  customer_name text,
  customer_phone text,
  redemption_code text,
  redeemed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff_of(p_business_id) then
    raise exception 'not authorized';
  end if;

  return query
    select rr.id, c.name, c.phone, rr.redemption_code, rr.redeemed_at
    from reward_redemptions rr
    join memberships m on m.id = rr.membership_id
    join customers c on c.id = m.customer_id
    where rr.business_id = p_business_id and rr.redeemed_at is not null
    order by rr.redeemed_at desc;
end;
$$;

grant execute on function list_claimed_redemptions(uuid) to authenticated;

-- Staff: lightweight home-dashboard stats (scans today, total customers,
-- rewards redeemed, repeat-visit rate).
create or replace function get_business_stats(p_business_id uuid)
returns table (
  scans_today int,
  total_customers int,
  rewards_redeemed int,
  repeat_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_customers int;
  v_repeat_customers int;
begin
  if not is_staff_of(p_business_id) then
    raise exception 'not authorized';
  end if;

  select count(*) into v_total_customers from memberships where business_id = p_business_id;
  select count(*) into v_repeat_customers from memberships
    where business_id = p_business_id and total_rewards_redeemed > 0;

  return query
    select
      (select count(*)::int from stamp_events
        where business_id = p_business_id and status = 'approved' and approved_at::date = current_date),
      v_total_customers,
      (select count(*)::int from reward_redemptions
        where business_id = p_business_id and redeemed_at is not null),
      case when v_total_customers = 0 then 0
        else round(v_repeat_customers::numeric / v_total_customers::numeric * 100, 0)
      end;
end;
$$;

grant execute on function get_business_stats(uuid) to authenticated;

-- Staff: approved-stamp counts per day for the last 7 days (Weekly Scans chart).
create or replace function get_weekly_scans(p_business_id uuid)
returns table (day date, scans int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff_of(p_business_id) then
    raise exception 'not authorized';
  end if;

  return query
    select d::date, coalesce((
      select count(*)::int from stamp_events se
      where se.business_id = p_business_id and se.status = 'approved' and se.approved_at::date = d::date
    ), 0)
    from generate_series(current_date - interval '6 days', current_date, interval '1 day') as d
    order by d;
end;
$$;

grant execute on function get_weekly_scans(uuid) to authenticated;

-- Staff: cumulative customer count per day for the last 7 days (Customer
-- Growth chart).
create or replace function get_customer_growth(p_business_id uuid)
returns table (day date, total_customers int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff_of(p_business_id) then
    raise exception 'not authorized';
  end if;

  return query
    select d::date, (
      select count(*)::int from memberships m
      where m.business_id = p_business_id and m.joined_at::date <= d::date
    )
    from generate_series(current_date - interval '6 days', current_date, interval '1 day') as d
    order by d;
end;
$$;

grant execute on function get_customer_growth(uuid) to authenticated;

-- Rework request_stamp to respect Auto Approve Scans and Allow Multiple
-- Scans (per-business toggles added above).
create or replace function request_stamp(p_business_slug text)
returns stamp_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_membership memberships%rowtype;
  v_allow_multiple boolean;
  v_auto_approve boolean;
  v_event stamp_events%rowtype;
  v_already_today boolean;
begin
  v_customer_id := current_customer_id();
  if v_customer_id is null then
    raise exception 'not registered';
  end if;

  select m.* into v_membership
  from memberships m join businesses b on b.id = m.business_id
  where m.customer_id = v_customer_id and b.slug = p_business_slug;

  if not found then
    raise exception 'not a member of this business';
  end if;

  select b.allow_multiple_scans_per_day, b.auto_approve_scans
    into v_allow_multiple, v_auto_approve
  from businesses b where b.id = v_membership.business_id;

  if not v_allow_multiple then
    select exists (
      select 1 from stamp_events se
      where se.membership_id = v_membership.id and se.status = 'approved' and se.approved_at::date = current_date
    ) into v_already_today;
    if v_already_today then
      raise exception 'already collected a stamp today';
    end if;
  end if;

  begin
    insert into stamp_events (membership_id, business_id)
    values (v_membership.id, v_membership.business_id)
    returning * into v_event;
  exception when unique_violation then
    raise exception 'a stamp request is already pending';
  end;

  if v_auto_approve then
    update stamp_events set status = 'approved' where id = v_event.id
    returning * into v_event;
  end if;

  return v_event;
end;
$$;

grant execute on function request_stamp(text) to anon, authenticated;
