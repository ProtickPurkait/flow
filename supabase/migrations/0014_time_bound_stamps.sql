-- Flow: time-bound stamp collection + a provider-agnostic WhatsApp
-- notification queue (welcome, deadline reminders, expiry, staff-sent
-- promos). No WhatsApp provider is wired up yet -- this migration builds
-- the full "who needs what message, and when" engine; sending is a stub
-- until real API credentials are added (see supabase/functions/send-whatsapp).

alter table stamp_programs add column collection_deadline_enabled boolean not null default false;
alter table stamp_programs add column collection_deadline_days int not null default 90 check (collection_deadline_days > 0);

alter table memberships add column current_cycle_started_at timestamptz;
alter table memberships add column collection_deadline_at timestamptz;

create table whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  membership_id uuid references memberships(id) on delete cascade,
  type text not null check (type in ('welcome', 'deadline_reminder', 'card_expired', 'promo')),
  reminder_days_before int,
  cycle_started_at timestamptz,
  message_body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped_not_configured')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index on whatsapp_notifications(status, created_at);
create index on whatsapp_notifications(business_id, created_at desc);

-- One reminder per (membership, type, day-offset, cycle) -- a card that
-- expires and starts a fresh cycle is allowed a fresh set of reminders.
create unique index whatsapp_notifications_dedupe on whatsapp_notifications (
  membership_id, type, coalesce(reminder_days_before, -1), coalesce(cycle_started_at, 'epoch'::timestamptz)
);

alter table whatsapp_notifications enable row level security;

create policy whatsapp_notifications_select on whatsapp_notifications
  for select using (is_staff_of(business_id));

-- Credit a stamp: on the FIRST stamp of a fresh cycle (current_stamps was
-- 0), start the clock -- and set a deadline if the program requires one.
create or replace function handle_stamp_event_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership memberships%rowtype;
  v_program stamp_programs%rowtype;
begin
  if new.status = 'approved' and old.status = 'pending' then
    new.approved_at := now();

    select * into v_membership from memberships where id = new.membership_id;
    select * into v_program from stamp_programs where id = v_membership.program_id;

    update memberships m
      set current_stamps = m.current_stamps + 1,
          last_visit_at = now(),
          current_cycle_started_at = case when m.current_stamps = 0 then now() else m.current_cycle_started_at end,
          collection_deadline_at = case
            when m.current_stamps = 0 and coalesce(v_program.collection_deadline_enabled, false)
              then now() + make_interval(days => v_program.collection_deadline_days)
            when m.current_stamps = 0 then null
            else m.collection_deadline_at
          end
      where m.id = new.membership_id;
  end if;
  return new;
end;
$$;

-- A redeemed reward resets the card -- clear the deadline clock too, since
-- the next stamp starts an entirely new cycle.
create or replace function handle_reward_redeemed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.redeemed_at is not null and old.redeemed_at is null then
    update memberships
      set current_stamps = 0,
          total_rewards_redeemed = total_rewards_redeemed + 1,
          current_cycle_started_at = null,
          collection_deadline_at = null
      where id = new.membership_id;
  end if;
  return new;
end;
$$;

-- Daily sweep (scheduled via pg_cron below): expire overdue cards and
-- enqueue deadline-reminder messages at 7, 3, and 1 day(s) out.
create or replace function process_stamp_deadlines()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  for v_row in
    select m.id as membership_id, m.customer_id, m.business_id, m.current_cycle_started_at, b.name as business_name
    from memberships m
    join businesses b on b.id = m.business_id
    join stamp_programs sp on sp.id = m.program_id
    where sp.collection_deadline_enabled
      and m.collection_deadline_at is not null
      and m.collection_deadline_at < now()
      and m.current_stamps > 0
      and m.current_stamps < coalesce(sp.stamps_required, 2147483647)
  loop
    insert into whatsapp_notifications (customer_id, business_id, membership_id, type, cycle_started_at, message_body)
    values (
      v_row.customer_id, v_row.business_id, v_row.membership_id, 'card_expired', v_row.current_cycle_started_at,
      format(
        'Your stamp card at %s has expired before you finished collecting -- your progress has been reset. Scan the QR code on your next visit to start a fresh card!',
        v_row.business_name
      )
    )
    on conflict do nothing;

    update memberships
      set current_stamps = 0, current_cycle_started_at = null, collection_deadline_at = null
      where id = v_row.membership_id;
  end loop;

  for v_row in
    select
      m.id as membership_id, m.customer_id, m.business_id, m.current_cycle_started_at, m.current_stamps,
      sp.stamps_required, b.name as business_name,
      ceil(extract(epoch from (m.collection_deadline_at - now())) / 86400.0)::int as days_left
    from memberships m
    join businesses b on b.id = m.business_id
    join stamp_programs sp on sp.id = m.program_id
    where sp.collection_deadline_enabled
      and m.collection_deadline_at is not null
      and m.collection_deadline_at > now()
      and m.current_stamps > 0
      and m.current_stamps < coalesce(sp.stamps_required, 2147483647)
  loop
    if v_row.days_left in (7, 3, 1) then
      insert into whatsapp_notifications (
        customer_id, business_id, membership_id, type, reminder_days_before, cycle_started_at, message_body
      )
      values (
        v_row.customer_id, v_row.business_id, v_row.membership_id, 'deadline_reminder', v_row.days_left, v_row.current_cycle_started_at,
        format(
          'In %s day%s you must complete your last stamp collection at %s or it will expire. You''re at %s of %s stamps -- don''t lose your progress!',
          v_row.days_left, case when v_row.days_left = 1 then '' else 's' end, v_row.business_name, v_row.current_stamps, v_row.stamps_required
        )
      )
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'process-stamp-deadlines',
  '0 3 * * *',
  $$select process_stamp_deadlines();$$
) where not exists (select 1 from cron.job where jobname = 'process-stamp-deadlines');

-- Staff: send a one-off promotional message to every customer on this
-- business's loyalty program (e.g. "we just added a new reward!").
create or replace function send_promo_message(p_business_id uuid, p_message text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not is_staff_of(p_business_id) then
    raise exception 'not authorized';
  end if;
  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'message is required';
  end if;

  insert into whatsapp_notifications (customer_id, business_id, membership_id, type, message_body)
  select m.customer_id, p_business_id, m.id, 'promo', trim(p_message)
  from memberships m
  where m.business_id = p_business_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function send_promo_message(uuid, text) to authenticated;

-- Staff: quick visibility into the notification queue for their business.
create or replace function list_whatsapp_notifications(p_business_id uuid, p_limit int default 50)
returns table (
  id uuid,
  customer_name text,
  customer_phone text,
  type text,
  message_body text,
  status text,
  created_at timestamptz,
  sent_at timestamptz
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
    select wn.id, c.name, c.phone, wn.type, wn.message_body, wn.status, wn.created_at, wn.sent_at
    from whatsapp_notifications wn
    join customers c on c.id = wn.customer_id
    where wn.business_id = p_business_id
    order by wn.created_at desc
    limit p_limit;
end;
$$;

grant execute on function list_whatsapp_notifications(uuid, int) to authenticated;
