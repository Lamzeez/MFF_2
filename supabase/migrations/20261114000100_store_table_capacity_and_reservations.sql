-- Migration: 20261114000100_store_table_capacity_and_reservations.sql
-- Description: Add table_capacity and reservations_enabled columns to public.stores

begin;

alter table public.stores
add column if not exists table_capacity integer not null default 8,
add column if not exists reservations_enabled boolean not null default true;

grant update (table_capacity, reservations_enabled) on public.stores to authenticated;

commit;
