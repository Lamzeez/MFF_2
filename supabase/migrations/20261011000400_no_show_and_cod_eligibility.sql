-- Migration: 20261011000400_no_show_and_cod_eligibility.sql
-- Purpose: Add cod_strikes and cod_eligible columns to profiles, and RPC functions for no-show strikes and merchant re-broadcast.

begin;

-- 1. Add COD strikes and eligibility to profiles
alter table public.profiles
  add column if not exists cod_strikes integer not null default 0 check (cod_strikes >= 0),
  add column if not exists cod_eligible boolean not null default true;

create index if not exists idx_profiles_cod_eligible on public.profiles(cod_eligible);

-- 2. Function to record a customer no-show strike
create or replace function public.record_customer_no_show_strike(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_new_strikes integer;
  v_eligible boolean;
begin
  update public.profiles
  set
    cod_strikes = cod_strikes + 1,
    cod_eligible = case when (cod_strikes + 1) >= 2 then false else true end,
    updated_at = now()
  where id = p_customer_id
  returning cod_strikes, cod_eligible into v_new_strikes, v_eligible;

  return jsonb_build_object(
    'customer_id', p_customer_id,
    'cod_strikes', coalesce(v_new_strikes, 0),
    'cod_eligible', coalesce(v_eligible, true)
  );
end;
$$;

-- 3. Function for merchant to re-broadcast delayed courier
create or replace function public.merchant_rebroadcast_order(p_order_id uuid, p_reason text default 'Courier pickup delayed')
returns public.orders
language plpgsql
security definer
as $$
declare
  v_order public.orders;
  v_timestamp text;
begin
  v_timestamp := to_char(now(), 'HH12:MI:SS AM');

  update public.orders
  set
    rider_id = null,
    status = 'ready_for_pickup',
    notes = coalesce(notes || ' ', '') || format('[Merchant Re-broadcast: %s at %s]', p_reason, v_timestamp),
    updated_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

commit;
