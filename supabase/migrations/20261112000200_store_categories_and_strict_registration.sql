-- Migration: 20261112000200_store_categories_and_strict_registration.sql
-- Purpose: Add multi-category support (`public.stores.categories`) and enforce strict backend field validation in `merchant_submit_store_application`.

begin;

-- 1. Structured store categories array on public.stores (add column & constraint before backfill update to avoid pending trigger error SQLSTATE 55006)
alter table public.stores
  add column if not exists categories text[] not null default array['Karenderias']::text[];

alter table public.stores
  drop constraint if exists stores_categories_valid_chk;

alter table public.stores
  add constraint stores_categories_valid_chk
  check (
    cardinality(categories) between 1 and 6
    and categories <@ array['Meals', 'Karenderias', 'Seafood', 'BBQ & Grill', 'Merienda', 'Beverages']::text[]
  );

grant update (categories) on public.stores to authenticated;

update public.stores
set categories = case
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) ~ '(seafood|tuna|fish|squid|marlin|lapu)'
    and lower(coalesce(name, '') || ' ' || coalesce(description, '')) ~ '(grill|bbq|inasal|skewer)'
    then array['Seafood', 'BBQ & Grill']::text[]
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) ~ '(seafood|tuna|fish|squid|marlin|lapu)'
    then array['Seafood']::text[]
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) ~ '(grill|bbq|inasal|skewer)'
    then array['BBQ & Grill']::text[]
  when lower(coalesce(name, '') || ' ' || coalesce(description, '')) ~ '(merienda|shake|smoothie|halo|coffee|milk tea|beverage|drink)'
    then array['Merienda', 'Beverages']::text[]
  else array['Meals', 'Karenderias']::text[]
end
where cardinality(categories) = 0
   or categories = array['Karenderias']::text[];

-- 2. Drop legacy 10-argument signature so no overload ambiguity remains
drop function if exists public.merchant_submit_store_application(
  text, text, text, text, text, text, boolean, double precision, double precision, text
);

-- 3. Recreate strict 11-argument application submission RPC
create or replace function public.merchant_submit_store_application(
  p_name text,
  p_address_text text,
  p_barangay text default '',
  p_public_phone text default null,
  p_description text default '',
  p_operating_hours text default '07:00 AM - 08:00 PM Daily',
  p_delivery_enabled boolean default false,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_verification_document_url text default null,
  p_categories text[] default array['Meals']::text[]
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
  v_clean_categories text[];
  v_hours_parts text[];
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

  -- Store name: strip control characters, collapse spaces, require 2..160 chars & at least one letter
  v_clean_name := btrim(regexp_replace(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]+', ' ', 'g'), '\s+', ' ', 'g'));
  if char_length(v_clean_name) < 2 or char_length(v_clean_name) > 160 or v_clean_name !~ '[A-Za-z]' then
    raise exception 'Store name must be 2 to 160 characters and contain letters' using errcode = '22023';
  end if;

  -- Store categories: 1..6 canonical selections, deduplicated
  select coalesce(array_agg(cat order by first_ord), '{}'::text[])
  into v_clean_categories
  from (
    select btrim(val) as cat, min(ord) as first_ord
    from unnest(coalesce(p_categories, '{}'::text[])) with ordinality as u(val, ord)
    where btrim(coalesce(val, '')) <> ''
    group by btrim(val)
  ) dedup;

  if cardinality(v_clean_categories) < 1
     or cardinality(v_clean_categories) > 6
     or not (v_clean_categories <@ array['Meals', 'Karenderias', 'Seafood', 'BBQ & Grill', 'Merienda', 'Beverages']::text[]) then
    raise exception 'Choose at least one valid store category' using errcode = '22023';
  end if;

  -- Barangay allowlist
  v_clean_barangay := btrim(regexp_replace(coalesce(p_barangay, ''), '[[:cntrl:]]+', '', 'g'));
  if v_clean_barangay not in ('Central (Poblacion)', 'Dahican', 'Sainz', 'Matiao', 'Badas', 'Mayo') then
    raise exception 'Select a valid barangay in Mati City' using errcode = '22023';
  end if;

  -- Street address: strip control characters, collapse spaces, require 8..500 chars & at least one letter
  v_clean_address := btrim(regexp_replace(regexp_replace(coalesce(p_address_text, ''), '[[:cntrl:]]+', ' ', 'g'), '\s+', ' ', 'g'));
  if char_length(v_clean_address) < 8 or char_length(v_clean_address) > 500 or v_clean_address !~ '[A-Za-z]' then
    raise exception 'Complete street address must be at least 8 characters and include street or landmark details' using errcode = '22023';
  end if;

  -- Store contact phone: PH mobile (09XXXXXXXXX / +639XXXXXXXXX) or Davao Oriental landline (087XXXXXXX / +6387XXXXXXX)
  v_clean_phone := nullif(regexp_replace(btrim(coalesce(p_public_phone, '')), '[\s()-]+', '', 'g'), '');
  if v_clean_phone is null or v_clean_phone !~ '^(\+639\d{9}|09\d{9}|\+6387\d{7}|087\d{7})$' then
    raise exception 'Enter a valid Philippine mobile or (087) landline phone number' using errcode = '22023';
  end if;

  -- Description: bounded to 4000 chars, control chars stripped
  v_clean_desc := left(btrim(regexp_replace(coalesce(p_description, ''), '[[:cntrl:]]+', ' ', 'g')), 4000);

  -- Operating hours: strict 'Open 24 Hours' or 'HH:MM AM - HH:MM PM Daily'
  v_clean_hours := btrim(regexp_replace(coalesce(p_operating_hours, ''), '[[:cntrl:]]+', ' ', 'g'));
  if v_clean_hours <> 'Open 24 Hours' then
    if v_clean_hours !~ '^(0?[1-9]|1[0-2]):[0-5]\d (AM|PM) - (0?[1-9]|1[0-2]):[0-5]\d (AM|PM) Daily$' then
      raise exception 'Select valid opening and closing hours or choose Open 24 Hours' using errcode = '22023';
    end if;
    v_hours_parts := regexp_match(v_clean_hours, '^((?:0?[1-9]|1[0-2]):[0-5]\d (?:AM|PM)) - ((?:0?[1-9]|1[0-2]):[0-5]\d (?:AM|PM)) Daily$');
    if v_hours_parts is null or v_hours_parts[1] = v_hours_parts[2] then
      raise exception 'Closing time must differ from opening time' using errcode = '22023';
    end if;
  end if;

  -- Map coordinates: strictly required and within Mati City / Davao Oriental bounds
  if p_latitude is null or p_longitude is null then
    raise exception 'Pin your store location on the map' using errcode = '22023';
  end if;
  if p_latitude < 6.75 or p_latitude > 7.10 or p_longitude < 126.05 or p_longitude > 126.40 then
    raise exception 'Store map pin must be located within Mati City service boundaries' using errcode = '22023';
  end if;
  v_location := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;

  -- Verification document URL: strictly required Supabase public storage HTTPS URL
  v_clean_doc := nullif(btrim(regexp_replace(coalesce(p_verification_document_url, ''), '[[:cntrl:]]+', '', 'g')), '');
  if v_clean_doc is null
     or char_length(v_clean_doc) > 1000
     or v_clean_doc !~ '^https://[^/\s]+/storage/v1/object/public/(store-branding|foodie-uploads)/[A-Za-z0-9_./-]+$' then
    raise exception 'Upload a valid storefront photo or business permit image' using errcode = '22023';
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
    categories,
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
    v_clean_categories,
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
    'categories', to_jsonb(v_clean_categories),
    'approval_status', v_status::text
  );
end;
$$;

revoke all on function public.merchant_submit_store_application(
  text, text, text, text, text, text, boolean, double precision, double precision, text, text[]
) from public, anon;
grant execute on function public.merchant_submit_store_application(
  text, text, text, text, text, text, boolean, double precision, double precision, text, text[]
) to authenticated;

commit;
