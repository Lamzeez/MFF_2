-- Migration: 20261112000600_store_profile_logo_and_menu_item_image.sql
-- Description: Add store logo_url (profile photo) and menu_items image_url (overview photo) with authenticated grants

begin;

alter table public.stores
add column if not exists logo_url text;

grant update (logo_url) on public.stores to authenticated;

alter table public.menu_items
add column if not exists image_url text;

grant insert (image_url) on public.menu_items to authenticated;
grant update (image_url) on public.menu_items to authenticated;

commit;
