-- 20261117000200_fix_realtime_reservations_and_delivery_flow.sql
-- Grant sequence permissions, ensure full replica identity and publication for real-time ordering and reservations,
-- and enable delivery for approved stores to support complete end-to-end multi-role testing.

begin;

-- 1. Grant usage on order and reservation sequences to authenticated and anon
grant usage on sequence public.reservation_number_seq to authenticated, anon;
grant usage on sequence public.order_number_seq to authenticated, anon;

-- 2. Ensure table_reservations and orders have full replica identity for realtime broadcasts
alter table public.orders replica identity full;
alter table public.table_reservations replica identity full;

-- 3. Ensure tables are in supabase_realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'table_reservations'
  ) then
    alter publication supabase_realtime add table public.table_reservations;
  end if;
end $$;

-- 4. Enable delivery for all currently approved stores so rider delivery & COD can be tested across all stores
update public.stores
set delivery_enabled = true
where approval_status = 'approved'
  and delivery_enabled = false;

commit;
