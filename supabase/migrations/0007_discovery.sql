-- Flow: discovery + cross-business customer app schema additions.
alter table businesses add column category text;
alter table businesses add column latitude double precision;
alter table businesses add column longitude double precision;
alter table businesses add column is_verified boolean not null default false;

alter table customers add column email text;
alter table customers add column avatar_url text;

create index on businesses(category);

-- Public: browse/search active businesses (Explore tab). No auth required --
-- businesses is already publicly readable when active (see 0003_rls.sql).
create or replace function explore_businesses(
  p_query text default null,
  p_category text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (
  id uuid,
  name text,
  slug text,
  logo_url text,
  category text,
  address text,
  is_verified boolean,
  reward_description text,
  distance_km double precision
)
language sql
stable
security definer
set search_path = public
as $$
  -- distance_km is a SELECT-list alias; Postgres only lets ORDER BY reference
  -- an output alias as a bare top-level item, not inside another expression
  -- (e.g. CASE ... THEN distance_km END), so the ordering happens in an outer
  -- query where it's a real column instead.
  select id, name, slug, logo_url, category, address, is_verified, reward_description, distance_km
  from (
    select
      b.id, b.name, b.slug, b.logo_url, b.category, b.address, b.is_verified,
      sp.reward_description,
      case
        when p_lat is null or p_lng is null or b.latitude is null or b.longitude is null then null
        else (
          6371 * acos(
            least(1.0, greatest(-1.0,
              cos(radians(p_lat)) * cos(radians(b.latitude)) * cos(radians(b.longitude) - radians(p_lng))
              + sin(radians(p_lat)) * sin(radians(b.latitude))
            ))
          )
        )
      end as distance_km,
      b.created_at
    from businesses b
    left join stamp_programs sp on sp.business_id = b.id and sp.is_active
    where b.status = 'active'
      and (p_category is null or b.category = p_category)
      and (p_query is null or b.name ilike '%' || p_query || '%')
  ) sub
  order by
    case when p_lat is not null and p_lng is not null then distance_km end asc nulls last,
    created_at desc
  limit 60;
$$;

grant execute on function explore_businesses(text, text, double precision, double precision) to anon, authenticated;

-- Customer: every card this device's customer has started, across all businesses.
create or replace function list_my_cards()
returns table (
  membership_id uuid,
  business_id uuid,
  business_name text,
  business_slug text,
  logo_url text,
  category text,
  current_stamps int,
  stamps_required int,
  reward_description text,
  last_visit_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := current_customer_id();
  if v_customer_id is null then
    return;
  end if;

  return query
    select m.id, b.id, b.name, b.slug, b.logo_url, b.category,
           m.current_stamps, sp.stamps_required, sp.reward_description, m.last_visit_at
    from memberships m
    join businesses b on b.id = m.business_id
    left join stamp_programs sp on sp.id = m.program_id
    where m.customer_id = v_customer_id
    order by m.last_visit_at desc nulls last, m.joined_at desc;
end;
$$;

grant execute on function list_my_cards() to anon, authenticated;

-- Customer: every reward this device's customer has ever unlocked, claimed or not.
create or replace function list_my_rewards()
returns table (
  redemption_id uuid,
  business_name text,
  business_slug text,
  logo_url text,
  reward_description text,
  redemption_code text,
  unlocked_at timestamptz,
  redeemed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := current_customer_id();
  if v_customer_id is null then
    return;
  end if;

  return query
    select rr.id, b.name, b.slug, b.logo_url, sp.reward_description, rr.redemption_code, rr.created_at, rr.redeemed_at
    from reward_redemptions rr
    join memberships m on m.id = rr.membership_id
    join businesses b on b.id = m.business_id
    left join stamp_programs sp on sp.id = rr.program_id
    where m.customer_id = v_customer_id
    order by rr.created_at desc;
end;
$$;

grant execute on function list_my_rewards() to anon, authenticated;

-- Customer: edit their own profile (name/email); phone stays immutable as the
-- cross-business identity key.
create or replace function update_my_profile(p_name text, p_email text)
returns table (id uuid, phone text, name text, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := current_customer_id();
  if v_customer_id is null then
    raise exception 'not registered';
  end if;

  update customers
    set name = nullif(trim(coalesce(p_name, '')), ''),
        email = nullif(trim(coalesce(p_email, '')), '')
    where customers.id = v_customer_id;

  return query select customers.id, customers.phone, customers.name, customers.email
    from customers where customers.id = v_customer_id;
end;
$$;

grant execute on function update_my_profile(text, text) to anon, authenticated;

-- Customer: read their own profile (name/phone/email) without mutating it.
create or replace function get_my_profile()
returns table (id uuid, phone text, name text, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  v_customer_id := current_customer_id();
  if v_customer_id is null then
    return;
  end if;

  return query select customers.id, customers.phone, customers.name, customers.email
    from customers where customers.id = v_customer_id;
end;
$$;

grant execute on function get_my_profile() to anon, authenticated;
