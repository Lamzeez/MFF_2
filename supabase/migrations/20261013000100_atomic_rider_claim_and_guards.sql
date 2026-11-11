-- ========================================================================
-- Migration: 20261013000100_atomic_rider_claim_and_guards.sql
-- Purpose: Concurrency-safe atomic courier job claim RPC (accept_delivery_job)
--          utilizing Postgres SELECT ... FOR UPDATE row-level locking.
-- ========================================================================

create or replace function public.accept_delivery_job(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.has_platform_role('rider') then
    raise exception 'Rider platform role required to claim delivery jobs' using errcode = '42501';
  end if;

  -- Atomic row-level lock on the target order to eliminate race conditions
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Delivery order not found' using errcode = 'P0002';
  end if;

  if v_order.fulfillment_type <> 'delivery' then
    raise exception 'This order is scheduled for customer pickup, not courier delivery' using errcode = '22023';
  end if;

  if v_order.rider_id is not null and v_order.rider_id <> v_caller_id then
    raise exception 'Job has already been claimed by another courier' using errcode = '40001';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'This order has been cancelled and cannot be claimed' using errcode = '22023';
  end if;

  if v_order.status not in ('ready_for_pickup', 'accepted', 'preparing') then
    raise exception 'Order is not in an eligible dispatch state' using errcode = '22023';
  end if;

  -- Atomically claim the delivery job for the caller
  update public.orders
  set rider_id = v_caller_id,
      status = 'out_for_delivery',
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.accept_delivery_job(uuid) from public, anon;
grant execute on function public.accept_delivery_job(uuid) to authenticated;

-- Ensure claim_delivery_job is an alias calling accept_delivery_job for backwards compatibility
create or replace function public.claim_delivery_job(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.accept_delivery_job(p_order_id);
end;
$$;

revoke all on function public.claim_delivery_job(uuid) from public, anon;
grant execute on function public.claim_delivery_job(uuid) to authenticated;
