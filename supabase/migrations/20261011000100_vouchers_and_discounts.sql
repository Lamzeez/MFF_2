-- Migration: 20261011000100_vouchers_and_discounts.sql
-- Purpose: Schema, tables, RLS policies, and seed data for Discounts and Promo Vouchers in Mati City.

begin;

-- 1. Create discount_type enum if not exists
do $$
begin
  if not exists (select 1 from pg_type where typname = 'discount_type') then
    create type public.discount_type as enum ('free_delivery', 'fixed', 'percentage');
  end if;
end $$;

-- 2. Vouchers table
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(btrim(code)) >= 2),
  description text,
  discount_type text not null check (discount_type in ('free_delivery', 'fixed', 'percentage')),
  value numeric not null default 0 check (value >= 0),
  min_spend numeric not null default 0 check (min_spend >= 0),
  valid_until timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  times_used integer not null default 0 check (times_used >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vouchers_code_idx on public.vouchers(code);
create index if not exists vouchers_active_idx on public.vouchers(is_active, valid_until);

-- 3. Voucher Redemptions table (Enforces single-use rules per user)
create table if not exists public.voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.vouchers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  discount_applied numeric not null default 0 check (discount_applied >= 0),
  redeemed_at timestamptz not null default now(),
  constraint voucher_redemptions_user_voucher_unique unique (voucher_id, user_id)
);

create index if not exists voucher_redemptions_user_idx on public.voucher_redemptions(user_id);
create index if not exists voucher_redemptions_voucher_idx on public.voucher_redemptions(voucher_id);
create index if not exists voucher_redemptions_order_idx on public.voucher_redemptions(order_id);

-- 4. Add discount columns to orders table
alter table public.orders
  add column if not exists discount_centavos integer not null default 0 check (discount_centavos >= 0),
  add column if not exists voucher_code text,
  add column if not exists voucher_id uuid references public.vouchers(id) on delete set null;

-- 5. Enable RLS
alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;

-- Vouchers RLS: Authenticated and anon can read active vouchers
drop policy if exists vouchers_read_policy on public.vouchers;
create policy vouchers_read_policy on public.vouchers for select
  to authenticated, anon
  using (is_active = true and (valid_until is null or valid_until > now()));

drop policy if exists vouchers_admin_all on public.vouchers;
create policy vouchers_admin_all on public.vouchers for all
  to authenticated
  using (exists (select 1 from private.platform_roles pr where pr.user_id = auth.uid() and pr.role = 'admin'));

-- Voucher Redemptions RLS: Users can view and insert their own redemptions
drop policy if exists voucher_redemptions_select_own on public.voucher_redemptions;
create policy voucher_redemptions_select_own on public.voucher_redemptions for select
  to authenticated
  using (user_id = auth.uid() or exists (select 1 from private.platform_roles pr where pr.user_id = auth.uid() and pr.role = 'admin'));

drop policy if exists voucher_redemptions_insert_own on public.voucher_redemptions;
create policy voucher_redemptions_insert_own on public.voucher_redemptions for insert
  to authenticated
  with check (user_id = auth.uid());

-- 6. Seed Canonical Mati Vouchers
insert into public.vouchers (code, description, discount_type, value, min_spend, valid_until, usage_limit, is_active)
values
  ('MATIFIRST', 'First order free delivery across Mati City', 'free_delivery', 35, 0, now() + interval '2 years', 10000, true),
  ('MATI50', '₱50 off for orders ₱200 and above', 'fixed', 50, 200, now() + interval '2 years', 5000, true),
  ('HALAHALA10', '10% off Mati seafood & delicacies (min spend ₱150)', 'percentage', 10, 150, now() + interval '2 years', 5000, true)
on conflict (code) do update set
  description = excluded.description,
  discount_type = excluded.discount_type,
  value = excluded.value,
  min_spend = excluded.min_spend,
  is_active = true;

commit;
