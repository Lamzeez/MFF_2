-- Migration: 20261001000300_notifications_and_visits.sql
-- Purpose: Backend tables and RLS for Realtime Notifications and In-Store QR Stand Check-Ins (Visits).

begin;

-- 1. Notifications Table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) > 0),
  message text not null check (char_length(message) > 0),
  type text not null default 'system' check (type in ('order', 'reservation', 'promo', 'system')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon;
grant select, insert, update, delete on public.notifications to authenticated;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_platform_role('admin'))
);

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
with check (
  (select private.is_active_account())
);

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_platform_role('admin'))
);

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_platform_role('admin'))
);

-- 2. Store Visits (In-Store QR Stand Scans & Check-Ins)
create table if not exists public.store_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  verified_via text not null default 'qr_scan' check (verified_via in ('qr_scan', 'order_fulfillment', 'manual')),
  visited_at timestamptz not null default now()
);

create index if not exists store_visits_user_idx on public.store_visits(user_id, visited_at desc);
create index if not exists store_visits_store_idx on public.store_visits(store_id);

alter table public.store_visits enable row level security;
revoke all on public.store_visits from public, anon;
grant select, insert on public.store_visits to authenticated;

drop policy if exists store_visits_select on public.store_visits;
create policy store_visits_select on public.store_visits for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.store_memberships sm
    where sm.store_id = store_visits.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
  )
  or (select private.has_platform_role('admin'))
);

drop policy if exists store_visits_insert on public.store_visits;
create policy store_visits_insert on public.store_visits for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_active_account())
);

-- 3. Add to Supabase Realtime Publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;
