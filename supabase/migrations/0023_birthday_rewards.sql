-- Flow: birthday rewards, reusing the WhatsApp message pipeline built for
-- deadline reminders. Off by default per program; a customer's birthdate is
-- entirely optional and collected from their own Profile page, never at
-- registration. When enabled, a customer whose birthday matches today gets
-- a bonus stamp on that business's card plus a customizable WhatsApp
-- message -- both credited by a daily cron sweep, mirroring
-- process_stamp_deadlines' own pattern.

alter table customers add column date_of_birth date;

alter table stamp_programs add column birthday_message_enabled boolean not null default false;
alter table stamp_programs add column birthday_message_template text not null default
  'Happy Birthday from {business_name}! We''ve added a bonus stamp to your card as our treat -- come celebrate with us soon.';

-- Birthday messages recur every year for the same membership, so the
-- existing dedupe key (which ignores year) would block every year after
-- the first. Add a year marker and widen the dedupe index to include it.
alter table whatsapp_notifications add column occurrence_year int;

alter table whatsapp_notifications drop constraint if exists whatsapp_notifications_type_check;
alter table whatsapp_notifications add constraint whatsapp_notifications_type_check
  check (type in ('welcome', 'deadline_reminder', 'card_expired', 'promo', 'birthday'));

drop index if exists whatsapp_notifications_dedupe;
create unique index whatsapp_notifications_dedupe on whatsapp_notifications (
  membership_id, type, coalesce(reminder_days_before, -1), coalesce(cycle_started_at, 'epoch'::timestamptz),
  coalesce(occurrence_year, -1)
);

create or replace function process_birthday_rewards()
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
    select m.id as membership_id, m.customer_id, m.business_id,
           b.name as business_name, sp.birthday_message_template,
           sp.collection_deadline_enabled, sp.collection_deadline_days
    from memberships m
    join customers c on c.id = m.customer_id
    join businesses b on b.id = m.business_id
    join stamp_programs sp on sp.id = m.program_id
    where sp.birthday_message_enabled
      and c.date_of_birth is not null
      and extract(month from c.date_of_birth) = extract(month from current_date)
      and extract(day from c.date_of_birth) = extract(day from current_date)
  loop
    v_message := replace(v_row.birthday_message_template, '{business_name}', v_row.business_name);

    begin
      insert into whatsapp_notifications (
        customer_id, business_id, membership_id, type, occurrence_year, message_body
      )
      values (
        v_row.customer_id, v_row.business_id, v_row.membership_id, 'birthday',
        extract(year from current_date)::int, v_message
      );

      update memberships m
        set current_stamps = m.current_stamps + 1,
            last_visit_at = now(),
            current_cycle_started_at = case when m.current_stamps = 0 then now() else m.current_cycle_started_at end,
            collection_deadline_at = case
              when m.current_stamps = 0 and coalesce(v_row.collection_deadline_enabled, false)
                then now() + make_interval(days => v_row.collection_deadline_days)
              when m.current_stamps = 0 then null
              else m.collection_deadline_at
            end
        where m.id = v_row.membership_id;
    exception when unique_violation then
      -- already sent this year's birthday reward for this membership
      null;
    end;
  end loop;
end;
$$;

select cron.schedule(
  'process-birthday-rewards',
  '0 4 * * *',
  $$select process_birthday_rewards();$$
) where not exists (select 1 from cron.job where jobname = 'process-birthday-rewards');

drop function if exists update_my_profile(text, text);

create function update_my_profile(p_name text, p_email text, p_date_of_birth date default null)
returns table (id uuid, phone text, name text, email text, referral_code text, date_of_birth date)
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
        email = nullif(trim(coalesce(p_email, '')), ''),
        date_of_birth = p_date_of_birth
    where customers.id = v_customer_id;

  return query select customers.id, customers.phone, customers.name, customers.email, customers.referral_code,
    customers.date_of_birth
    from customers where customers.id = v_customer_id;
end;
$$;

grant execute on function update_my_profile(text, text, date) to anon, authenticated;

drop function if exists get_my_profile();

create function get_my_profile()
returns table (id uuid, phone text, name text, email text, referral_code text, date_of_birth date)
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

  return query select customers.id, customers.phone, customers.name, customers.email, customers.referral_code,
    customers.date_of_birth
    from customers where customers.id = v_customer_id;
end;
$$;

grant execute on function get_my_profile() to anon, authenticated;
