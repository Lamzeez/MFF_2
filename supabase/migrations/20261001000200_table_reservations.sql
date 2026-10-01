-- Migration: 20261001000200_table_reservations.sql
-- Purpose: Real Dine-In Table Reservations backend pipeline with PostGIS store association, RLS, and realtime.

begin;

-- 1. Reservation status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'reservation_status') then
    create type public.reservation_status as enum (
      'pending',
      'confirmed',
      'declined',
      'cancelled',
      'completed',
      'no_show'
    );
  end if;
end $$;

-- 2. Reservation number sequence
create sequence if not exists public.reservation_number_seq start with 1001;

-- 3. Table Reservations
create table if not exists public.table_reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique default ('RES-' || nextval('public.reservation_number_seq')),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  customer_name text not null check (char_length(customer_name) > 0),
  customer_phone text not null default '',
  party_size integer not null check (party_size > 0 and party_size <= 50),
  reservation_date text not null,
  reservation_time text not null,
  seating_preference text default 'Indoor Dining',
  special_notes text default '',
  store_notes text default '',
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for updated_at
drop trigger if exists set_table_reservations_updated_at on public.table_reservations;
create trigger set_table_reservations_updated_at
before update on public.table_reservations
for each row execute function private.touch_updated_at();

-- Indexes
create index if not exists table_reservations_store_id_idx on public.table_reservations(store_id);
create index if not exists table_reservations_customer_id_idx on public.table_reservations(customer_id);
create index if not exists table_reservations_status_idx on public.table_reservations(status);
create index if not exists table_reservations_created_at_idx on public.table_reservations(created_at desc);

-- 4. Enable Row Level Security
alter table public.table_reservations enable row level security;
revoke all on public.table_reservations from public, anon;
grant select, insert, update on public.table_reservations to authenticated;

-- RLS Policies
drop policy if exists table_reservations_select on public.table_reservations;
create policy table_reservations_select on public.table_reservations for select to authenticated
using (
  -- 1. Customer who booked
  customer_id = (select auth.uid())
  -- 2. Store staff managing reservations
  or exists (
    select 1 from public.store_memberships sm
    where sm.store_id = table_reservations.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
  )
  -- 3. Platform admin
  or (select private.has_platform_role('admin'))
);

drop policy if exists table_reservations_insert on public.table_reservations;
create policy table_reservations_insert on public.table_reservations for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and (select private.is_active_account())
);

drop policy if exists table_reservations_update on public.table_reservations;
create policy table_reservations_update on public.table_reservations for update to authenticated
using (
  -- Store staff managing reservations
  exists (
    select 1 from public.store_memberships sm
    where sm.store_id = table_reservations.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
  )
  -- Customer cancelling own pending/confirmed reservation
  or (
    customer_id = (select auth.uid())
    and status in ('pending', 'confirmed')
  )
  -- Platform admin
  or (select private.has_platform_role('admin'))
);

-- Realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'table_reservations'
  ) then
    alter publication supabase_realtime add table public.table_reservations;
  end if;
end $$;

commit;
