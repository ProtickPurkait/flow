-- Flow: SECURITY DEFINER RPCs. These are the only way `customers` (and
-- cross-customer views of memberships) are ever read or written.
--
-- Note: RETURNS TABLE(...) implicitly declares a plpgsql variable per output
-- column, in scope for the whole function body. Any bare (unqualified)
-- column reference that happens to share a name with an output column -- and
-- also with a real table column -- is rejected as ambiguous, so those must
-- always be qualified with the table name/alias.

-- Customer: called once per device, right after an anonymous auth session
-- exists, to capture phone + name and link this device to a global customer.
create or replace function register_customer(p_phone text, p_name text default null)
returns table (id uuid, phone text, name text, customer_token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer customers%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_phone is null or length(trim(p_phone)) < 6 then
    raise exception 'invalid phone number';
  end if;

  select * into v_customer from customers where customers.phone = trim(p_phone);

  if not found then
    insert into customers (phone, name) values (trim(p_phone), nullif(trim(p_name), ''))
    returning * into v_customer;
  elsif p_name is not null and length(trim(p_name)) > 0 and v_customer.name is null then
    update customers set name = trim(p_name) where customers.id = v_customer.id
    returning * into v_customer;
  end if;

  insert into customer_auth_links (auth_user_id, customer_id)
  values (auth.uid(), v_customer.id)
  on conflict (auth_user_id) do update set customer_id = excluded.customer_id;

  return query select v_customer.id, v_customer.phone, v_customer.name, v_customer.customer_token;
end;
$$;

grant execute on function register_customer(text, text) to anon, authenticated;

-- Upsert helper for join_business, split out so its own scope has no
-- RETURNS-TABLE-shadowed variable named "business_id" -- the ON CONFLICT
-- target list can't be table-qualified, so that ambiguity can't be fixed
-- in place the way a WHERE clause can.
create or replace function upsert_membership(p_customer_id uuid, p_business_id uuid, p_program_id uuid)
returns memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership memberships%rowtype;
begin
  insert into memberships (customer_id, business_id, program_id)
  values (p_customer_id, p_business_id, p_program_id)
  on conflict (customer_id, business_id) do update
    set program_id = coalesce(excluded.program_id, memberships.program_id)
  returning * into v_membership;
  return v_membership;
end;
$$;

-- Customer: join (or resume) a business's stamp program. Safe to call every
-- visit -- idempotent via the memberships unique constraint.
create or replace function join_business(p_business_slug text)
returns table (
  membership_id uuid,
  business_id uuid,
  business_name text,
  brand_color text,
  logo_url text,
  google_review_url text,
  instagram_handle text,
  program_id uuid,
  program_name text,
  stamps_required int,
  reward_description text,
  current_stamps int,
  total_rewards_redeemed int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_business businesses%rowtype;
  v_program stamp_programs%rowtype;
  v_membership memberships%rowtype;
begin
  v_customer_id := current_customer_id();
  if v_customer_id is null then
    raise exception 'not registered';
  end if;

  select * into v_business from businesses where slug = p_business_slug and status = 'active';
  if not found then
    raise exception 'business not found';
  end if;

  select * into v_program from stamp_programs
    where stamp_programs.business_id = v_business.id and stamp_programs.is_active
    limit 1;

  v_membership := upsert_membership(v_customer_id, v_business.id, v_program.id);

  return query select
    v_membership.id, v_business.id, v_business.name, v_business.brand_color, v_business.logo_url,
    v_business.google_review_url, v_business.instagram_handle,
    v_program.id, v_program.name, v_program.stamps_required, v_program.reward_description,
    v_membership.current_stamps, v_membership.total_rewards_redeemed;
end;
$$;

grant execute on function join_business(text) to anon, authenticated;

-- Customer: has this device already been linked to a customer identity?
create or replace function is_registered()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_customer_id() is not null;
$$;

grant execute on function is_registered() to anon, authenticated;

-- Customer: request a stamp (creates a pending approval for staff).
create or replace function request_stamp(p_business_slug text)
returns stamp_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_membership memberships%rowtype;
  v_event stamp_events%rowtype;
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

  begin
    insert into stamp_events (membership_id, business_id)
    values (v_membership.id, v_membership.business_id)
    returning * into v_event;
  exception when unique_violation then
    raise exception 'a stamp request is already pending';
  end;

  return v_event;
end;
$$;

grant execute on function request_stamp(text) to anon, authenticated;

-- Staff: customer list for the dashboard (customers table itself has no
-- client-facing policies, so this is the only way to read it in bulk).
create or replace function list_business_customers(p_business_id uuid)
returns table (
  customer_id uuid,
  name text,
  phone text,
  current_stamps int,
  stamps_required int,
  total_rewards_redeemed int,
  joined_at timestamptz,
  last_visit_at timestamptz
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
    select c.id, c.name, c.phone, m.current_stamps, sp.stamps_required,
           m.total_rewards_redeemed, m.joined_at, m.last_visit_at
    from memberships m
    join customers c on c.id = m.customer_id
    left join stamp_programs sp on sp.id = m.program_id
    where m.business_id = p_business_id
    order by m.last_visit_at desc nulls last;
end;
$$;

grant execute on function list_business_customers(uuid) to authenticated;

-- Staff: pending stamp approval queue with customer identity attached.
create or replace function list_pending_stamp_requests(p_business_id uuid)
returns table (
  stamp_event_id uuid,
  membership_id uuid,
  customer_name text,
  customer_phone text,
  current_stamps int,
  stamps_required int,
  requested_at timestamptz
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
    select se.id, se.membership_id, c.name, c.phone, m.current_stamps, sp.stamps_required, se.created_at
    from stamp_events se
    join memberships m on m.id = se.membership_id
    join customers c on c.id = m.customer_id
    left join stamp_programs sp on sp.id = m.program_id
    where se.business_id = p_business_id and se.status = 'pending'
    order by se.created_at asc;
end;
$$;

grant execute on function list_pending_stamp_requests(uuid) to authenticated;

-- Staff: unredeemed rewards ready to be marked redeemed in person.
create or replace function list_pending_redemptions(p_business_id uuid)
returns table (
  redemption_id uuid,
  membership_id uuid,
  customer_name text,
  customer_phone text,
  redemption_code text,
  unlocked_at timestamptz
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
    select rr.id, rr.membership_id, c.name, c.phone, rr.redemption_code, rr.created_at
    from reward_redemptions rr
    join memberships m on m.id = rr.membership_id
    join customers c on c.id = m.customer_id
    where rr.business_id = p_business_id and rr.redeemed_at is null
    order by rr.created_at asc;
end;
$$;

grant execute on function list_pending_redemptions(uuid) to authenticated;
