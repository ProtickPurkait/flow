-- Surface the collection deadline to both sides: customers (their card
-- countdown) and staff (who's about to expire, for the Customers list).
drop function if exists list_my_cards();

create function list_my_cards()
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
  last_visit_at timestamptz,
  collection_deadline_at timestamptz
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
           m.current_stamps, sp.stamps_required, sp.reward_description, m.last_visit_at, m.collection_deadline_at
    from memberships m
    join businesses b on b.id = m.business_id
    left join stamp_programs sp on sp.id = m.program_id
    where m.customer_id = v_customer_id
    order by m.last_visit_at desc nulls last, m.joined_at desc;
end;
$$;

grant execute on function list_my_cards() to anon, authenticated;

drop function if exists list_business_customers(uuid);

create function list_business_customers(p_business_id uuid)
returns table (
  customer_id uuid,
  name text,
  phone text,
  current_stamps int,
  stamps_required int,
  total_rewards_redeemed int,
  joined_at timestamptz,
  last_visit_at timestamptz,
  collection_deadline_at timestamptz
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
           m.total_rewards_redeemed, m.joined_at, m.last_visit_at, m.collection_deadline_at
    from memberships m
    join customers c on c.id = m.customer_id
    left join stamp_programs sp on sp.id = m.program_id
    where m.business_id = p_business_id
    order by m.last_visit_at desc nulls last;
end;
$$;

grant execute on function list_business_customers(uuid) to authenticated;
