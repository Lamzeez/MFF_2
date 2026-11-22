-- Migration: 20261122000100_store_subscription_payments.sql
-- Description: Store subscription payment ledger and atomic PayMongo confirmation functions

begin;

-- 1. Create store subscription payment ledger table
create table if not exists public.store_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  tier text not null check (tier in ('basic', 'standard', 'commercial')),
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'PHP',
  paymongo_checkout_session_id text unique,
  paymongo_payment_id text,
  payment_method text check (payment_method is null or payment_method in ('gcash', 'paymaya', 'card', 'grab_pay', 'dob', 'online_banking')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired')),
  billing_cycle_start timestamptz not null default now(),
  billing_cycle_end timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for performant lookups
create index if not exists idx_store_sub_payments_store_id on public.store_subscription_payments(store_id);
create index if not exists idx_store_sub_payments_session_id on public.store_subscription_payments(paymongo_checkout_session_id);
create index if not exists idx_store_sub_payments_status on public.store_subscription_payments(status);

-- 3. Row Level Security (RLS)
alter table public.store_subscription_payments enable row level security;

-- Drop any existing policies if re-run
drop policy if exists sub_payments_select on public.store_subscription_payments;
drop policy if exists sub_payments_insert on public.store_subscription_payments;
drop policy if exists sub_payments_update on public.store_subscription_payments;
drop policy if exists sub_payments_delete on public.store_subscription_payments;

-- SELECT policy: Store owner/managers can view their own store payments; System Admins can view all payments
create policy sub_payments_select on public.store_subscription_payments
  for select to authenticated
  using (
    private.can_manage_catalog(store_id)
    or (select private.has_platform_role('admin'))
  );

-- INSERT policy: Store owners can insert pending checkout records for their store
create policy sub_payments_insert on public.store_subscription_payments
  for insert to authenticated
  with check (
    private.can_manage_catalog(store_id)
    or (select private.has_platform_role('admin'))
  );

-- UPDATE policy: Only admins or internal security definer functions update payments
create policy sub_payments_update on public.store_subscription_payments
  for update to authenticated
  using ((select private.has_platform_role('admin')))
  with check ((select private.has_platform_role('admin')));

-- DELETE policy: System Admins only
create policy sub_payments_delete on public.store_subscription_payments
  for delete to authenticated
  using ((select private.has_platform_role('admin')));

-- 4. Function: Record Checkout Intent
create or replace function public.record_subscription_checkout_intent(
  p_store_id uuid,
  p_tier text,
  p_amount numeric,
  p_session_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_clean_tier text := lower(btrim(coalesce(p_tier, '')));
begin
  if not private.can_manage_catalog(p_store_id) then
    raise exception 'Permission denied for store subscription management.' using errcode = '42501';
  end if;

  if v_clean_tier not in ('basic', 'standard', 'commercial') then
    raise exception 'Invalid subscription tier.' using errcode = '22023';
  end if;

  insert into public.store_subscription_payments (
    store_id,
    tier,
    amount,
    currency,
    paymongo_checkout_session_id,
    status
  ) values (
    p_store_id,
    v_clean_tier,
    p_amount,
    'PHP',
    p_session_id,
    'pending'
  )
  on conflict (paymongo_checkout_session_id) do update set
    tier = excluded.tier,
    amount = excluded.amount,
    updated_at = now()
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

revoke all on function public.record_subscription_checkout_intent(uuid, text, numeric, text) from public, anon;
grant execute on function public.record_subscription_checkout_intent(uuid, text, numeric, text) to authenticated;

-- 5. Function: Confirm Subscription Payment & Activate Store Tier
create or replace function public.confirm_subscription_payment(
  p_session_id text,
  p_payment_id text default null,
  p_payment_method text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record public.store_subscription_payments%rowtype;
  v_store public.stores%rowtype;
begin
  select * into v_record
  from public.store_subscription_payments
  where paymongo_checkout_session_id = p_session_id;

  if not found then
    raise exception 'Subscription payment record not found.' using errcode = '22023';
  end if;

  if not (private.can_manage_catalog(v_record.store_id) or private.has_platform_role('admin')) then
    raise exception 'Permission denied.' using errcode = '42501';
  end if;

  -- Update payment record to paid
  update public.store_subscription_payments
  set
    status = 'paid',
    paymongo_payment_id = coalesce(p_payment_id, paymongo_payment_id),
    payment_method = coalesce(p_payment_method, payment_method, 'gcash'),
    billing_cycle_start = now(),
    billing_cycle_end = now() + interval '30 days',
    updated_at = now()
  where id = v_record.id
  returning * into v_record;

  -- Update store subscription tier atomically
  update public.stores
  set
    subscription_tier = v_record.tier,
    subscription_status = 'active',
    subscribed_at = now(),
    updated_at = now()
  where id = v_record.store_id
  returning * into v_store;

  return jsonb_build_object(
    'payment_id', v_record.id,
    'store_id', v_record.store_id,
    'tier', v_record.tier,
    'status', v_record.status,
    'amount', v_record.amount,
    'payment_method', v_record.payment_method,
    'billing_cycle_start', v_record.billing_cycle_start,
    'billing_cycle_end', v_record.billing_cycle_end,
    'store_subscription_tier', v_store.subscription_tier,
    'store_subscription_status', v_store.subscription_status
  );
end;
$$;

revoke all on function public.confirm_subscription_payment(text, text, text) from public, anon;
grant execute on function public.confirm_subscription_payment(text, text, text) to authenticated;

-- 6. Function: Fetch Invoices for a Store
create or replace function public.get_store_subscription_invoices(p_store_id uuid)
returns setof public.store_subscription_payments
language sql
security definer
set search_path = ''
as $$
  select *
  from public.store_subscription_payments
  where store_id = p_store_id
    and (private.can_manage_catalog(p_store_id) or private.has_platform_role('admin'))
  order by created_at desc;
$$;

revoke all on function public.get_store_subscription_invoices(uuid) from public, anon;
grant execute on function public.get_store_subscription_invoices(uuid) to authenticated;

commit;
