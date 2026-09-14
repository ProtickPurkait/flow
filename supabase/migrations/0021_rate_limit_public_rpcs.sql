-- Flow: rate-limit the RPCs callable by anon/unauthenticated sessions.
-- register_customer, request_stamp, and draw_scratch_card had nothing
-- stopping a script from hammering them -- draw_scratch_card in particular
-- has no cooldown at all, so a tight loop could win far more prizes than a
-- business's configured odds intend. This is a technical throttle against
-- scripted abuse, not a redesign of any feature's rules.

create table rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index on rate_limit_hits(key, created_at);

-- Self-pruning: each check deletes its own key's expired hits, so the table
-- never needs a separate cleanup job.
create or replace function check_rate_limit(p_key text, p_max_calls int, p_window_seconds int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from rate_limit_hits
    where key = p_key and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count from rate_limit_hits where key = p_key;

  if v_count >= p_max_calls then
    raise exception 'too many requests -- please wait a moment and try again';
  end if;

  insert into rate_limit_hits (key) values (p_key);
end;
$$;

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

  perform check_rate_limit('register_customer:' || auth.uid()::text, 5, 60);

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
  v_min_order numeric;
  v_event stamp_events%rowtype;
  v_already_today boolean;
begin
  v_customer_id := current_customer_id();
  if v_customer_id is null then
    raise exception 'not registered';
  end if;

  perform check_rate_limit('request_stamp:' || v_customer_id::text, 10, 60);

  select m.* into v_membership
  from memberships m join businesses b on b.id = m.business_id
  where m.customer_id = v_customer_id and b.slug = p_business_slug;

  if not found then
    raise exception 'not a member of this business';
  end if;

  select b.allow_multiple_scans_per_day, b.auto_approve_scans
    into v_allow_multiple, v_auto_approve
  from businesses b where b.id = v_membership.business_id;

  select sp.minimum_order_value into v_min_order
  from stamp_programs sp where sp.id = v_membership.program_id;

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

  if v_auto_approve and coalesce(v_min_order, 0) = 0 then
    update stamp_events set status = 'approved' where id = v_event.id
    returning * into v_event;
  end if;

  return v_event;
end;
$$;

grant execute on function request_stamp(text) to anon, authenticated;

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

  perform check_rate_limit('draw_scratch_card:' || v_customer_id::text, 5, 60);

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
