-- Migration: 20261014000100_store_branding_and_personalization.sql
-- Description: Add operating_hours and cover_image_url to stores, personalization_consent to profiles, and store-branding storage bucket

begin;

-- 1. Add operating_hours and cover_image_url columns to public.stores
alter table public.stores 
add column if not exists operating_hours text not null default '7:00 AM - 8:30 PM Daily',
add column if not exists cover_image_url text;

-- 2. Grant update permissions on new store columns to authenticated
grant update (operating_hours, cover_image_url) on public.stores to authenticated;

-- 3. Add personalization_consent to public.profiles
alter table public.profiles
add column if not exists personalization_consent boolean not null default true;

-- 4. Grant update on personalization_consent to authenticated
grant update (personalization_consent) on public.profiles to authenticated;

-- 5. Create public storage bucket store-branding for merchant cover photos and branding
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-branding',
  'store-branding',
  true,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Public Read Policy for store-branding
drop policy if exists "Public can view store branding" on storage.objects;
create policy "Public can view store branding"
on storage.objects for select
using (bucket_id = 'store-branding');

-- Authenticated Upload Policy for store-branding
drop policy if exists "Authenticated users can upload store branding" on storage.objects;
create policy "Authenticated users can upload store branding"
on storage.objects for insert
to authenticated
with check (bucket_id = 'store-branding');

-- Owner Update Policy for store-branding
drop policy if exists "Users can update store branding" on storage.objects;
create policy "Users can update store branding"
on storage.objects for update
to authenticated
using (bucket_id = 'store-branding');

commit;
