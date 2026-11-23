-- Migration: Fix Store Subscription Payments Permissions & Service Role Access
-- File: supabase/migrations/20261123000100_fix_store_subscription_payments_permissions.sql

begin;

-- 1. Update record_subscription_checkout_intent to support service_role and authenticated
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
  v_clean_tier text := lower(trim(p_tier));
  v_is_service boolean := (auth.role() = 'service_role' or current_user = 'service_role');
begin
  if not v_is_service and not private.can_manage_catalog(p_store_id) then
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
grant execute on function public.record_subscription_checkout_intent(uuid, text, numeric, text) to authenticated, service_role;

-- 2. Update confirm_subscription_payment to allow service_role and authenticated store manager
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
  v_is_service boolean := (auth.role() = 'service_role' or current_user = 'service_role');
begin
  select * into v_record
  from public.store_subscription_payments
  where paymongo_checkout_session_id = p_session_id;

  if not found then
    raise exception 'Subscription payment record not found for session %', p_session_id using errcode = '22023';
  end if;

  if not v_is_service and not (private.can_manage_catalog(v_record.store_id) or private.has_platform_role('admin')) then
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
grant execute on function public.confirm_subscription_payment(text, text, text) to authenticated, service_role;

-- 3. Update get_store_subscription_invoices to allow authenticated store managers and service_role
create or replace function public.get_store_subscription_invoices(p_store_id uuid)
returns setof public.store_subscription_payments
language sql
security definer
set search_path = ''
as $$
  select *
  from public.store_subscription_payments
  where store_id = p_store_id
    and (
      auth.role() = 'service_role'
      or current_user = 'service_role'
      or private.can_manage_catalog(p_store_id)
      or private.has_platform_role('admin')
    )
  order by created_at desc;
$$;

revoke all on function public.get_store_subscription_invoices(uuid) from public, anon;
grant execute on function public.get_store_subscription_invoices(uuid) to authenticated, service_role;

commit;
