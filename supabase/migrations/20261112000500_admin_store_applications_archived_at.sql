-- Migration: 20261112000500_admin_store_applications_archived_at.sql
-- Purpose: Include `archived_at` in `admin_list_store_applications()` so System Admin can filter and reinstate suspended stores.

begin;

drop function if exists public.admin_list_store_applications();

create or replace function public.admin_list_store_applications()
returns table (
  id uuid,
  name text,
  slug text,
  categories text[],
  description text,
  public_phone text,
  operating_hours text,
  address_text text,
  barangay text,
  latitude double precision,
  longitude double precision,
  verification_document_url text,
  cover_image_url text,
  approval_status text,
  archived_at timestamptz,
  created_at timestamptz,
  owner_name text,
  owner_email text,
  owner_phone text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  return query
  select
    s.id,
    s.name,
    s.slug,
    coalesce(s.categories, array['Karenderias']::text[]) as categories,
    coalesce(s.description, '') as description,
    s.public_phone,
    coalesce(s.operating_hours, '07:00 AM - 08:00 PM Daily') as operating_hours,
    coalesce(s.address_text, '') as address_text,
    coalesce(s.barangay, '') as barangay,
    case
      when s.location is not null then extensions.st_y(s.location::extensions.geometry)
      else null
    end as latitude,
    case
      when s.location is not null then extensions.st_x(s.location::extensions.geometry)
      else null
    end as longitude,
    s.verification_document_url,
    s.cover_image_url,
    s.approval_status::text as approval_status,
    s.archived_at,
    s.created_at,
    owner_info.owner_name,
    owner_info.owner_email,
    owner_info.owner_phone
  from public.stores s
  left join lateral (
    select
      coalesce(nullif(btrim(p.display_name), ''), 'Store Owner') as owner_name,
      coalesce(u.email::text, '') as owner_email,
      coalesce(p.contact_phone, '') as owner_phone
    from public.store_memberships sm
    join public.profiles p on p.id = sm.user_id
    left join auth.users u on u.id = sm.user_id
    where sm.store_id = s.id
      and sm.is_active
    order by (sm.role = 'owner') desc, sm.created_at asc
    limit 1
  ) owner_info on true
  order by s.created_at desc;
end;
$$;

revoke all on function public.admin_list_store_applications() from public, anon, authenticated;
grant execute on function public.admin_list_store_applications() to authenticated;

commit;
