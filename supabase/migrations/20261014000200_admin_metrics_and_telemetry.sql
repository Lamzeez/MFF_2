-- Migration: 20261014000200_admin_metrics_and_telemetry.sql
-- Enables System Admin to query live monthly GMV time-series aggregations, real activity breakdowns, and user COD strike flags

begin;

-- 1. admin_get_monthly_gmv: Aggregates real gross marketplace volume by month (Asia/Manila) for live charts
create or replace function public.admin_get_monthly_gmv()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  perform private.require_admin();

  with months as (
    select date_trunc('month', timezone('Asia/Manila', now())) - (n || ' month')::interval as m_date
    from generate_series(8, 0, -1) as n
  ),
  aggregated as (
    select
      to_char(m.m_date, 'Mon') as month,
      to_char(m.m_date, 'YYYY-MM') as month_key,
      coalesce(sum(o.total_centavos), 0)::bigint as gross_sales_centavos,
      count(o.id)::int as order_count
    from months m
    left join public.orders o
      on date_trunc('month', timezone('Asia/Manila', o.created_at)) = m.m_date
      and o.status <> 'cancelled'
    group by m.m_date
    order by m.m_date asc
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'month', month,
      'month_key', month_key,
      'gross_sales_centavos', gross_sales_centavos,
      'order_count', order_count
    )
  ), '[]'::jsonb)
  into v_result
  from aggregated;

  return v_result;
end;
$$;

revoke all on function public.admin_get_monthly_gmv() from public, anon, authenticated;
grant execute on function public.admin_get_monthly_gmv() to authenticated;

-- 2. admin_get_discovery_channels: Queries real order, QR stand check-in, and community post counts
create or replace function public.admin_get_discovery_channels()
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_qr_count int;
  v_order_count int;
  v_post_count int;
  v_total int;
  v_qr_pct int;
  v_direct_pct int;
  v_social_pct int;
begin
  perform private.require_admin();

  select count(*)::int into v_qr_count
  from public.store_visits
  where verified_via = 'qr_scan';

  select count(*)::int into v_order_count
  from public.orders
  where status <> 'cancelled';

  select count(*)::int into v_post_count
  from public.community_posts
  where coalesce(is_hidden, false) = false;

  v_total := v_qr_count + v_order_count + v_post_count;

  if v_total > 0 then
    v_direct_pct := round((v_order_count::numeric / v_total::numeric) * 100);
    v_qr_pct := least(round((v_qr_count::numeric / v_total::numeric) * 100)::int, 100 - v_direct_pct);
    v_social_pct := 100 - v_direct_pct - v_qr_pct;
  else
    v_direct_pct := 0;
    v_qr_pct := 0;
    v_social_pct := 0;
  end if;

  return jsonb_build_object(
    'orders_count', v_order_count,
    'qr_checkins_count', v_qr_count,
    'community_posts_count', v_post_count,
    'total_interactions', v_total,
    'qr_percent', v_qr_pct,
    'direct_percent', v_direct_pct,
    'social_percent', v_social_pct
  );
end;
$$;

revoke all on function public.admin_get_discovery_channels() from public, anon, authenticated;
grant execute on function public.admin_get_discovery_channels() to authenticated;

-- 3. admin_list_users: Include live COD strike counts & eligibility on admin user listing
drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (
  id uuid,
  display_name text,
  phone_number text,
  account_status public.account_status,
  created_at timestamptz,
  email text,
  role text,
  cod_strikes integer,
  cod_eligible boolean
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
    end as role,
    coalesce(p.cod_strikes, 0) as cod_strikes,
    coalesce(p.cod_eligible, true) as cod_eligible
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon, authenticated;
grant execute on function public.admin_list_users() to authenticated;

commit;
