-- Flow: security-definer helper functions used throughout RLS policies.
-- All are STABLE + SECURITY DEFINER with a locked search_path so they can be
-- safely referenced from policies without exposing table contents directly.

create or replace function is_staff_of(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from business_staff
    where business_id = p_business_id
      and user_id = auth.uid()
  );
$$;

create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from super_admins where user_id = auth.uid()
  );
$$;

create or replace function current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select customer_id from customer_auth_links where auth_user_id = auth.uid();
$$;

create or replace function generate_redemption_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := lpad(floor(random() * 1000000)::text, 6, '0');
    select exists (select 1 from reward_redemptions where redemption_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

-- When a stamp_event flips to 'approved', credit the membership.
create or replace function handle_stamp_event_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    new.approved_at := now();
    update memberships
      set current_stamps = current_stamps + 1,
          last_visit_at = now()
      where id = new.membership_id;
  end if;
  return new;
end;
$$;

create trigger trg_stamp_event_approved
  before update on stamp_events
  for each row
  execute function handle_stamp_event_approved();

-- When a membership's stamp count reaches the program requirement, unlock a
-- reward redemption (idempotent: only one un-redeemed redemption at a time).
create or replace function handle_reward_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required int;
  v_has_open boolean;
begin
  select stamps_required into v_required from stamp_programs where id = new.program_id;
  if v_required is null or new.current_stamps < v_required then
    return new;
  end if;

  select exists (
    select 1 from reward_redemptions
    where membership_id = new.id and redeemed_at is null
  ) into v_has_open;

  if not v_has_open then
    insert into reward_redemptions (membership_id, business_id, program_id, redemption_code)
    values (new.id, new.business_id, new.program_id, generate_redemption_code());
  end if;

  return new;
end;
$$;

create trigger trg_reward_unlock
  after update of current_stamps on memberships
  for each row
  execute function handle_reward_unlock();

-- When staff mark a redemption as redeemed, reset the card for the next cycle.
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
          total_rewards_redeemed = total_rewards_redeemed + 1
      where id = new.membership_id;
  end if;
  return new;
end;
$$;

create trigger trg_reward_redeemed
  before update on reward_redemptions
  for each row
  execute function handle_reward_redeemed();
