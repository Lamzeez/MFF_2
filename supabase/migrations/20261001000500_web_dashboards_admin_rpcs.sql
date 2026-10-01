-- Migration: 20261001000500_web_dashboards_admin_rpcs.sql
-- Enables System Admin to view profiles and provides RPCs for real-time dashboards

begin;

-- 1. System Admin profiles SELECT policy
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles for select to authenticated
using ((select private.has_platform_role('admin')));

-- 2. System Admin: List all registered users with their roles
create or replace function public.admin_list_users()
returns table (
  id uuid,
  display_name text,
  phone_number text,
  account_status public.account_status,
  created_at timestamptz,
  email text,
  role text
)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select 
    p.id,
    coalesce(nullif(p.display_name, ''), 'Mati User') as display_name,
    coalesce(p.contact_phone, '') as phone_number,
    p.account_status,
    p.created_at,
    coalesce(u.email::text, 'no-email@mff.ph') as email,
    case 
      when exists (select 1 from private.platform_roles pr where pr.user_id = p.id and pr.role = 'admin') then 'Superadmin'
      when exists (select 1 from public.store_memberships sm where sm.user_id = p.id and sm.is_active and sm.role in ('owner', 'manager')) then 'Store Admin'
      when exists (select 1 from private.platform_roles pr where pr.user_id = p.id and pr.role = 'rider') then 'Rider'
      else 'Customer'
    end as role
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon, authenticated;
grant execute on function public.admin_list_users() to authenticated;

-- 3. System Admin: Platform Overview Telemetry & Stats
create or replace function public.admin_get_platform_metrics()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_total_users int;
  v_total_stores int;
  v_pending_stores int;
  v_active_riders int;
  v_total_orders int;
  v_gross_sales_centavos bigint;
begin
  perform private.require_admin();
  
  select count(*) into v_total_users from public.profiles;
  select count(*) into v_total_stores from public.stores where approval_status = 'approved' and archived_at is null;
  select count(*) into v_pending_stores from public.stores where approval_status = 'pending';
  select count(*) into v_active_riders from private.platform_roles where role = 'rider';
  select count(*), coalesce(sum(total_centavos), 0) into v_total_orders, v_gross_sales_centavos from public.orders where status <> 'cancelled';

  return jsonb_build_object(
    'total_users', v_total_users,
    'total_stores', v_total_stores,
    'pending_stores', v_pending_stores,
    'active_riders', v_active_riders,
    'total_orders', v_total_orders,
    'gross_sales_centavos', v_gross_sales_centavos
  );
end;
$$;

revoke all on function public.admin_get_platform_metrics() from public, anon, authenticated;
grant execute on function public.admin_get_platform_metrics() to authenticated;

-- 4. Store Admin: Merchant Store Metrics
create or replace function public.merchant_get_store_metrics(p_store_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_orders_today int;
  v_gross_sales_centavos bigint;
  v_active_orders int;
  v_reservations_today int;
  v_pending_reservations int;
begin
  if not (private.has_store_role(p_store_id, array['owner'::public.store_role, 'manager'::public.store_role, 'staff'::public.store_role]) or private.has_platform_role('admin')) then
    raise exception 'Permission denied for store' using errcode = '42501';
  end if;

  select count(*), coalesce(sum(total_centavos), 0)
  into v_orders_today, v_gross_sales_centavos
  from public.orders
  where store_id = p_store_id
    and status <> 'cancelled'
    and created_at >= date_trunc('day', now());

  select count(*)
  into v_active_orders
  from public.orders
  where store_id = p_store_id
    and status in ('placed', 'accepted', 'preparing', 'ready_for_pickup');

  select count(*), count(*) filter (where status = 'pending')
  into v_reservations_today, v_pending_reservations
  from public.table_reservations
  where store_id = p_store_id
    and status <> 'cancelled'
    and created_at >= date_trunc('day', now());

  return jsonb_build_object(
    'orders_today', v_orders_today,
    'gross_sales_centavos', v_gross_sales_centavos,
    'active_orders', v_active_orders,
    'reservations_today', v_reservations_today,
    'pending_reservations', v_pending_reservations
  );
end;
$$;

revoke all on function public.merchant_get_store_metrics(uuid) from public, anon, authenticated;
grant execute on function public.merchant_get_store_metrics(uuid) to authenticated;

commit;
