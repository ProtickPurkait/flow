-- Flow: optional minimum order value to collect a stamp, set per stamp
-- program from the Stamp Card page. Enforced server-side (RLS with-check on
-- the approval, not just trusted client input) since staff are the ones who
-- know the real order total.
--
-- When a program has a minimum set, Auto Approve Scans is skipped for that
-- business's requests regardless of the toggle -- nobody has entered an
-- amount yet, so there's nothing to approve automatically. The request
-- queues for manual approval, where staff enter the amount.

alter table stamp_programs add column minimum_order_value numeric(10, 2) not null default 0 check (minimum_order_value >= 0);
alter table stamp_events add column order_amount numeric(10, 2);

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

drop function if exists list_pending_stamp_requests(uuid);

create function list_pending_stamp_requests(p_business_id uuid)
returns table (
  stamp_event_id uuid,
  membership_id uuid,
  customer_name text,
  customer_phone text,
  current_stamps int,
  stamps_required int,
  minimum_order_value numeric,
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
    select se.id, se.membership_id, c.name, c.phone, m.current_stamps, sp.stamps_required,
           coalesce(sp.minimum_order_value, 0), se.created_at
    from stamp_events se
    join memberships m on m.id = se.membership_id
    join customers c on c.id = m.customer_id
    left join stamp_programs sp on sp.id = m.program_id
    where se.business_id = p_business_id and se.status = 'pending'
    order by se.created_at asc;
end;
$$;

grant execute on function list_pending_stamp_requests(uuid) to authenticated;

-- Staff approve/reject stamp_events by a direct table update (see
-- DashboardHome's respond()). Guard the approval itself here: if the
-- program has a minimum order value, the amount submitted with the update
-- must meet it. Rejects and un-gated programs are unaffected.
drop policy if exists stamp_events_update on stamp_events;
create policy stamp_events_update on stamp_events
  for update using (is_staff_of(business_id))
  with check (
    is_staff_of(business_id)
    and status in ('approved', 'rejected')
    and (
      status <> 'approved'
      or coalesce((
        select sp.minimum_order_value
        from memberships m
        join stamp_programs sp on sp.id = m.program_id
        where m.id = stamp_events.membership_id
      ), 0) <= coalesce(order_amount, 0)
    )
  );

-- Surface the minimum to the customer too, so "collect stamp" not being
-- instant isn't a mystery -- BusinessPage reads this off join_business.
drop function if exists join_business(text);

create function join_business(p_business_slug text)
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
  minimum_order_value numeric,
  current_stamps int,
  total_rewards_redeemed int,
  collection_deadline_at timestamptz
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
  v_message text;
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

  if v_program.id is not null then
    v_message := v_program.welcome_message_template;
    v_message := replace(v_message, '{business_name}', v_business.name);
    v_message := replace(v_message, '{stamps_required}', v_program.stamps_required::text);
    v_message := replace(v_message, '{reward_description}', coalesce(v_program.reward_description, ''));

    insert into whatsapp_notifications (customer_id, business_id, membership_id, type, message_body)
    values (v_customer_id, v_business.id, v_membership.id, 'welcome', v_message)
    on conflict do nothing;
  end if;

  return query select
    v_membership.id, v_business.id, v_business.name, v_business.brand_color, v_business.logo_url,
    v_business.google_review_url, v_business.instagram_handle,
    v_program.id, v_program.name, v_program.stamps_required, v_program.reward_description,
    coalesce(v_program.minimum_order_value, 0),
    v_membership.current_stamps, v_membership.total_rewards_redeemed, v_membership.collection_deadline_at;
end;
$$;

grant execute on function join_business(text) to anon, authenticated;
