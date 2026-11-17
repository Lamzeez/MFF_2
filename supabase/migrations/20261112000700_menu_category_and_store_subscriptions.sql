-- Migration: 20261112000700_menu_category_and_store_subscriptions.sql
-- Description: Persist menu_items.category and add store subscription_tier + 2-month free Basic trial tracking upon approval

begin;

-- 1. Menu item category column (excludes store-type labels like "Karenderias")
alter table public.menu_items
add column if not exists category text;

grant insert (category) on public.menu_items to authenticated;
grant update (category) on public.menu_items to authenticated;

-- 2. Store subscription tier & 2-month free Basic trial columns
alter table public.stores
add column if not exists subscription_tier text not null default 'basic',
add column if not exists subscription_status text not null default 'trial',
add column if not exists trial_started_at timestamptz,
add column if not exists trial_ends_at timestamptz,
add column if not exists subscribed_at timestamptz;

alter table public.stores
drop constraint if exists stores_subscription_tier_check;
alter table public.stores
add constraint stores_subscription_tier_check
check (subscription_tier in ('basic', 'standard', 'commercial'));

alter table public.stores
drop constraint if exists stores_subscription_status_check;
alter table public.stores
add constraint stores_subscription_status_check
check (subscription_status in ('trial', 'active', 'expired'));

-- Backfill already-approved stores with their 2-month free Basic trial window
update public.stores
set
  subscription_tier = coalesce(nullif(subscription_tier, ''), 'basic'),
  subscription_status = coalesce(nullif(subscription_status, ''), 'trial'),
  trial_started_at = coalesce(trial_started_at, created_at, now()),
  trial_ends_at = coalesce(trial_ends_at, coalesce(trial_started_at, created_at, now()) + interval '2 months')
where approval_status = 'approved'
  and trial_started_at is null;

-- 3. Activate the 2-month free Basic plan automatically when System Admin approves a store
create or replace function public.admin_set_store_approval(
  target_store uuid,
  new_status public.store_approval_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  update public.stores
  set
    approval_status = new_status,
    subscription_tier = case
      when new_status = 'approved' then coalesce(nullif(subscription_tier, ''), 'basic')
      else subscription_tier
    end,
    subscription_status = case
      when new_status = 'approved' then
        case when subscription_status = 'active' then 'active' else 'trial' end
      else subscription_status
    end,
    trial_started_at = case
      when new_status = 'approved' then coalesce(trial_started_at, now())
      else trial_started_at
    end,
    trial_ends_at = case
      when new_status = 'approved' then coalesce(trial_ends_at, coalesce(trial_started_at, now()) + interval '2 months')
      else trial_ends_at
    end
  where id = target_store;

  if not found then
    raise exception 'Store not found' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.admin_set_store_approval(uuid, public.store_approval_status) from public, anon, authenticated;
grant execute on function public.admin_set_store_approval(uuid, public.store_approval_status) to authenticated;

-- 4. Merchant RPC to choose/activate a subscription tier (Basic, Standard, Commercial)
create or replace function public.merchant_select_subscription_plan(
  p_store_id uuid,
  p_tier text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_tier text := lower(btrim(coalesce(p_tier, '')));
  v_row public.stores%rowtype;
begin
  if not private.can_manage_catalog(p_store_id) then
    raise exception 'Permission denied for store subscription management.' using errcode = '42501';
  end if;

  if v_clean_tier not in ('basic', 'standard', 'commercial') then
    raise exception 'Choose Basic, Standard, or Commercial subscription plan.' using errcode = '22023';
  end if;

  update public.stores
  set
    subscription_tier = v_clean_tier,
    subscription_status = 'active',
    subscribed_at = now(),
    updated_at = now()
  where id = p_store_id
  returning * into v_row;

  if not found then
    raise exception 'Store not found.' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'subscription_tier', v_row.subscription_tier,
    'subscription_status', v_row.subscription_status,
    'trial_started_at', v_row.trial_started_at,
    'trial_ends_at', v_row.trial_ends_at,
    'subscribed_at', v_row.subscribed_at
  );
end;
$$;

revoke all on function public.merchant_select_subscription_plan(uuid, text) from public, anon, authenticated;
grant execute on function public.merchant_select_subscription_plan(uuid, text) to authenticated;

commit;
