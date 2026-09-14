-- Enqueue a one-time WhatsApp welcome message the first time a customer
-- joins a business's loyalty program.
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
    insert into whatsapp_notifications (customer_id, business_id, membership_id, type, message_body)
    values (
      v_customer_id, v_business.id, v_membership.id, 'welcome',
      format(
        'Welcome to %s''s loyalty program! Collect %s stamps to unlock: %s. Show your card on every visit to add a stamp.',
        v_business.name, v_program.stamps_required, v_program.reward_description
      )
    )
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
