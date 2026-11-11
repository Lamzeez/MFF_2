-- Migration: 20261112000100_merchant_store_registration.sql
-- Purpose: Enable authenticated merchant self-registration of pending stores with PostGIS pinpoint coordinates and verification document storage.

begin;

-- 1. Store verification document URL for admin approval review (separate from public storefront cover_image_url)
alter table public.stores
  add column if not exists verification_document_url text
  check (verification_document_url is null or char_length(verification_document_url) <= 1000);

-- 2. RPC: Merchant submits a new store application (creates pending store + owner membership atomically)
create or replace function public.merchant_submit_store_application(
  p_name text,
  p_address_text text,
  p_barangay text default '',
  p_public_phone text default null,
  p_description text default '',
  p_operating_hours text default '7:00 AM - 8:30 PM Daily',
  p_delivery_enabled boolean default false,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_verification_document_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_clean_name text;
  v_clean_address text;
  v_clean_barangay text;
  v_clean_phone text;
  v_clean_desc text;
  v_clean_hours text;
  v_clean_doc text;
  v_base_slug text;
  v_slug text;
  v_location extensions.geography(Point, 4326);
  v_store_id uuid;
  v_status public.store_approval_status;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_active_target(v_uid);

  if private.has_platform_role('admin') then
    raise exception 'Administrator accounts cannot register a merchant store' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.store_memberships sm
    where sm.user_id = v_uid and sm.is_active
  ) then
    raise exception 'An active store application or store membership already exists for this account' using errcode = '23505';
  end if;

  v_clean_name := btrim(coalesce(p_name, ''));
  if char_length(v_clean_name) < 1 or char_length(v_clean_name) > 160 then
    raise exception 'Store name must be between 1 and 160 characters' using errcode = '22023';
  end if;

  v_clean_address := btrim(coalesce(p_address_text, ''));
  if char_length(v_clean_address) < 1 or char_length(v_clean_address) > 500 then
    raise exception 'Store address must be between 1 and 500 characters' using errcode = '22023';
  end if;

  v_clean_barangay := left(btrim(coalesce(p_barangay, '')), 120);
  v_clean_phone := nullif(left(btrim(coalesce(p_public_phone, '')), 32), '');
  v_clean_desc := left(btrim(coalesce(p_description, '')), 4000);
  v_clean_hours := coalesce(nullif(left(btrim(coalesce(p_operating_hours, '')), 120), ''), '7:00 AM - 8:30 PM Daily');
  v_clean_doc := nullif(left(btrim(coalesce(p_verification_document_url, '')), 1000), '');

  if (p_latitude is not null and p_longitude is null) or (p_latitude is null and p_longitude is not null) then
    raise exception 'Both latitude and longitude are required when pinning a map location' using errcode = '22023';
  end if;

  if p_latitude is not null and p_longitude is not null then
    if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
      raise exception 'Coordinates out of valid geographic bounds' using errcode = '22023';
    end if;
    v_location := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
  else
    v_location := null;
  end if;

  v_base_slug := regexp_replace(lower(v_clean_name), '[^a-z0-9]+', '-', 'g');
  v_base_slug := regexp_replace(v_base_slug, '(^-+|-+$)', '', 'g');
  if v_base_slug = '' then
    v_base_slug := 'store';
  end if;
  v_base_slug := left(v_base_slug, 160);
  v_slug := v_base_slug;

  if exists (select 1 from public.stores where slug = v_slug) then
    v_slug := left(v_base_slug, 170) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into public.stores (
    name,
    slug,
    description,
    public_phone,
    address_text,
    barangay,
    location,
    approval_status,
    delivery_enabled,
    operating_hours,
    verification_document_url
  ) values (
    v_clean_name,
    v_slug,
    v_clean_desc,
    v_clean_phone,
    v_clean_address,
    v_clean_barangay,
    v_location,
    'pending'::public.store_approval_status,
    coalesce(p_delivery_enabled, false),
    v_clean_hours,
    v_clean_doc
  )
  returning id, slug, approval_status
  into v_store_id, v_slug, v_status;

  insert into public.store_memberships (store_id, user_id, role, is_active)
  values (v_store_id, v_uid, 'owner'::public.store_role, true);

  return jsonb_build_object(
    'id', v_store_id,
    'name', v_clean_name,
    'slug', v_slug,
    'approval_status', v_status::text
  );
end;
$$;

revoke all on function public.merchant_submit_store_application(
  text, text, text, text, text, text, boolean, double precision, double precision, text
) from public, anon;
grant execute on function public.merchant_submit_store_application(
  text, text, text, text, text, text, boolean, double precision, double precision, text
) to authenticated;

commit;
