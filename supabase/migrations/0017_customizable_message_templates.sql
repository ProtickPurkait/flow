-- Flow: let each business write their own wording for the welcome,
-- deadline-reminder, and card-expired WhatsApp messages, with placeholders
-- Flow fills in at send time. Defaults match the previous hardcoded copy.

alter table stamp_programs add column welcome_message_template text not null default
  'Welcome to {business_name}''s loyalty program! Collect {stamps_required} stamps to unlock: {reward_description}. Show your card on every visit to add a stamp.';

alter table stamp_programs add column deadline_reminder_template text not null default
  'In {days_left} {days_unit} you must complete your last stamp collection at {business_name} or it will expire. You''re at {current_stamps} of {stamps_required} stamps -- don''t lose your progress!';

alter table stamp_programs add column card_expired_template text not null default
  'Your stamp card at {business_name} has expired before you finished collecting -- your progress has been reset. Scan the QR code on your next visit to start a fresh card!';

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
    v_membership.current_stamps, v_membership.total_rewards_redeemed, v_membership.collection_deadline_at;
end;
$$;

grant execute on function join_business(text) to anon, authenticated;

create or replace function process_stamp_deadlines()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_message text;
begin
  for v_row in
    select m.id as membership_id, m.customer_id, m.business_id, m.current_cycle_started_at,
           b.name as business_name, sp.card_expired_template
    from memberships m
    join businesses b on b.id = m.business_id
    join stamp_programs sp on sp.id = m.program_id
    where sp.collection_deadline_enabled
      and m.collection_deadline_at is not null
      and m.collection_deadline_at < now()
      and m.current_stamps > 0
      and m.current_stamps < coalesce(sp.stamps_required, 2147483647)
  loop
    v_message := replace(v_row.card_expired_template, '{business_name}', v_row.business_name);

    insert into whatsapp_notifications (customer_id, business_id, membership_id, type, cycle_started_at, message_body)
    values (v_row.customer_id, v_row.business_id, v_row.membership_id, 'card_expired', v_row.current_cycle_started_at, v_message)
    on conflict do nothing;

    update memberships
      set current_stamps = 0, current_cycle_started_at = null, collection_deadline_at = null
      where id = v_row.membership_id;
  end loop;

  for v_row in
    select
      m.id as membership_id, m.customer_id, m.business_id, m.current_cycle_started_at, m.current_stamps,
      sp.stamps_required, b.name as business_name, sp.deadline_reminder_template,
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
      v_message := v_row.deadline_reminder_template;
      v_message := replace(v_message, '{business_name}', v_row.business_name);
      v_message := replace(v_message, '{days_left}', v_row.days_left::text);
      v_message := replace(v_message, '{days_unit}', case when v_row.days_left = 1 then 'day' else 'days' end);
      v_message := replace(v_message, '{current_stamps}', v_row.current_stamps::text);
      v_message := replace(v_message, '{stamps_required}', coalesce(v_row.stamps_required::text, ''));

      insert into whatsapp_notifications (
        customer_id, business_id, membership_id, type, reminder_days_before, cycle_started_at, message_body
      )
      values (
        v_row.customer_id, v_row.business_id, v_row.membership_id, 'deadline_reminder', v_row.days_left, v_row.current_cycle_started_at, v_message
      )
      on conflict do nothing;
    end if;
  end loop;
end;
$$;
