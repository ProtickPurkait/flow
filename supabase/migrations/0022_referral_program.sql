-- Flow: referral mechanic -- "invite a friend, both get a stamp." Every
-- customer gets a short referral code (auto-generated on creation).
-- Sharing it via a business's join link (/b/:slug?ref=CODE) credits both
-- the referrer and the new customer one bonus stamp on that business's
-- card, the first time the new customer joins that specific business.

alter table customers add column referral_code text unique;

create or replace function generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I -- avoids ambiguous codes
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    end loop;
    select exists (select 1 from customers where referral_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

create or replace function set_customer_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_code is null then
    new.referral_code := generate_referral_code();
  end if;
  return new;
end;
$$;

create trigger trg_set_customer_referral_code
  before insert on customers
  for each row
  execute function set_customer_referral_code();

-- Backfill existing customers row-by-row (not a single bulk UPDATE) so each
-- generation sees prior rows' already-committed codes within this loop.
do $$
declare
  v_id uuid;
begin
  for v_id in select id from customers where referral_code is null loop
    update customers set referral_code = generate_referral_code() where id = v_id;
  end loop;
end $$;

alter table customers alter column referral_code set not null;

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_customer_id uuid not null references customers(id) on delete cascade,
  referred_customer_id uuid not null references customers(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (referred_customer_id, business_id)
);
create index on referrals(referrer_customer_id);

alter table referrals enable row level security;
-- No client policies: every read/write goes through join_business
-- (SECURITY DEFINER). Nothing here is queried directly by the client today.

drop function if exists join_business(text);

create function join_business(p_business_slug text, p_referral_code text default null)
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
  v_had_membership boolean;
  v_referrer_id uuid;
  v_referrer_membership memberships%rowtype;
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

  v_had_membership := exists (
    select 1 from memberships where customer_id = v_customer_id and memberships.business_id = v_business.id
  );

  v_membership := upsert_membership(v_customer_id, v_business.id, v_program.id);

  -- Referral bonus only on this customer's first-ever join to this
  -- business, and never for a self-referral. Directly updates memberships
  -- (mirroring process_stamp_deadlines' own pattern) rather than routing
  -- through stamp_events, since a referral bonus isn't a staff-witnessed
  -- visit -- but it replicates the same cycle-start/deadline logic the
  -- stamp_events trigger applies, so it behaves identically either way.
  if not v_had_membership and p_referral_code is not null and length(trim(p_referral_code)) > 0 then
    select id into v_referrer_id from customers where referral_code = upper(trim(p_referral_code));

    if v_referrer_id is not null and v_referrer_id <> v_customer_id then
      begin
        insert into referrals (referrer_customer_id, referred_customer_id, business_id)
        values (v_referrer_id, v_customer_id, v_business.id);

        v_referrer_membership := upsert_membership(v_referrer_id, v_business.id, v_program.id);

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
          where m.id = v_referrer_membership.id;

        update memberships m
          set current_stamps = m.current_stamps + 1,
              current_cycle_started_at = case when m.current_stamps = 0 then now() else m.current_cycle_started_at end,
              collection_deadline_at = case
                when m.current_stamps = 0 and coalesce(v_program.collection_deadline_enabled, false)
                  then now() + make_interval(days => v_program.collection_deadline_days)
                when m.current_stamps = 0 then null
                else m.collection_deadline_at
              end
          where m.id = v_membership.id
          returning * into v_membership;
      exception when unique_violation then
        -- already referred into this business before -- skip silently
        null;
      end;
    end if;
  end if;

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

grant execute on function join_business(text, text) to anon, authenticated;

drop function if exists update_my_profile(text, text);

create function update_my_profile(p_name text, p_email text)
returns table (id uuid, phone text, name text, email text, referral_code text)
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

  return query select customers.id, customers.phone, customers.name, customers.email, customers.referral_code
    from customers where customers.id = v_customer_id;
end;
$$;

grant execute on function update_my_profile(text, text) to anon, authenticated;

drop function if exists get_my_profile();

create function get_my_profile()
returns table (id uuid, phone text, name text, email text, referral_code text)
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

  return query select customers.id, customers.phone, customers.name, customers.email, customers.referral_code
    from customers where customers.id = v_customer_id;
end;
$$;

grant execute on function get_my_profile() to anon, authenticated;
