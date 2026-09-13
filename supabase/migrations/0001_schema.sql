-- Flow: core schema
create extension if not exists pgcrypto;

-- Businesses (tenants)
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  brand_color text default '#3D5CDB',
  address text,
  phone text,
  google_review_url text,
  instagram_handle text,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

-- Fenlark super admins (own account(s) only)
create table super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Business staff/owners (linked to Supabase auth.users)
create table business_staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

-- Stamp programs per business (v1: one active program per business)
create table stamp_programs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  stamps_required int not null default 5 check (stamps_required > 0),
  reward_description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index one_active_program_per_business on stamp_programs(business_id) where is_active;

-- Global customer identity (by phone number, shared across all businesses)
create table customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  customer_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Links one or more anonymous auth sessions (devices) to a single customer identity.
-- Anonymous Supabase Auth (no OTP, no password) is the real RLS/Realtime security
-- boundary; customer_token above is kept for audit purposes only.
create table customer_auth_links (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index on customer_auth_links(customer_id);

-- Per-business membership/state for a customer
create table memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  program_id uuid references stamp_programs(id),
  current_stamps int not null default 0,
  total_rewards_redeemed int not null default 0,
  joined_at timestamptz not null default now(),
  last_visit_at timestamptz,
  unique (customer_id, business_id)
);

create index on memberships(business_id);

-- Individual stamp requests (audit trail + staff approval queue)
create table stamp_events (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references memberships(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references business_staff(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create unique index one_pending_stamp_per_membership on stamp_events(membership_id) where status = 'pending';
create index on stamp_events(business_id, status);

-- Reward redemptions
create table reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references memberships(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  program_id uuid references stamp_programs(id),
  redemption_code text unique,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index on reward_redemptions(business_id);

-- Engagement clicks (Google review / Instagram follow nudges)
create table engagement_clicks (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references memberships(id) on delete cascade,
  type text not null check (type in ('google_review', 'instagram_follow')),
  clicked_at timestamptz not null default now()
);

-- QR codes per business (a business can have several: counter standee, box sticker, etc.)
create table qr_codes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  label text not null default 'default',
  created_at timestamptz not null default now()
);

create index on qr_codes(business_id);
