begin;
create extension if not exists postgis with schema extensions;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 180),
  description text not null default '' check (char_length(description) <= 4000),
  public_phone text check (char_length(public_phone) <= 32),
  address_text text not null check (char_length(btrim(address_text)) between 1 and 500),
  barangay text not null default '' check (char_length(barangay) <= 120),
  location extensions.geography(Point, 4326),
  approval_status public.store_approval_status not null default 'pending',
  delivery_enabled boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_location_not_empty check (location is null or not extensions.st_isempty(location::extensions.geometry))
);
create index stores_location_gist on public.stores using gist(location);
create index stores_public_idx on public.stores(id) where approval_status = 'approved' and archived_at is null;

create table public.store_memberships (
  store_id uuid not null references public.stores(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.store_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index store_memberships_user_idx on public.store_memberships(user_id, store_id) where is_active;

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  price_centavos integer not null check (price_centavos >= 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  is_published boolean not null default false,
  is_available boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.menu_items.is_available is 'Manual availability only, NOT inventory or a stock reservation.';
create index menu_items_store_idx on public.menu_items(store_id);
create index menu_items_public_idx on public.menu_items(store_id, id) where is_published and archived_at is null;

alter table public.stores enable row level security;
alter table public.store_memberships enable row level security;
alter table public.menu_items enable row level security;
revoke all on public.stores, public.store_memberships, public.menu_items from public, anon, authenticated;
grant select on public.stores, public.menu_items to anon, authenticated;
grant select on public.store_memberships to authenticated;
grant update (name, description, public_phone, address_text, barangay, location, delivery_enabled) on public.stores to authenticated;
grant insert (store_id, name, description, price_centavos, currency, is_published, is_available) on public.menu_items to authenticated;
grant update (name, description, price_centavos, is_published, is_available, archived_at) on public.menu_items to authenticated;
-- No client DELETE, ownership updates, approval updates, or membership writes.

create function private.has_store_role(target_store uuid, allowed_roles public.store_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active_account() and exists (
    select 1 from public.store_memberships m
    where m.store_id = target_store and m.user_id = (select auth.uid())
      and m.is_active and m.role = any(allowed_roles)
  );
$$;
create function private.can_manage_catalog(target_store uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_store_role(target_store, array['owner','manager']::public.store_role[])
    and exists (select 1 from public.stores s where s.id = target_store and s.archived_at is null);
$$;
create function private.is_public_store(target_store uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.stores s where s.id = target_store
    and s.approval_status = 'approved' and s.archived_at is null);
$$;
revoke all on function private.has_store_role(uuid, public.store_role[]), private.can_manage_catalog(uuid), private.is_public_store(uuid) from public, anon, authenticated;
grant execute on function private.has_store_role(uuid, public.store_role[]), private.can_manage_catalog(uuid) to authenticated;
grant execute on function private.is_public_store(uuid) to anon, authenticated;

create policy stores_public_read on public.stores for select to anon, authenticated
using (approval_status = 'approved' and archived_at is null);
create policy stores_member_read on public.stores for select to authenticated
using (private.has_store_role(id, array['owner','manager','staff']::public.store_role[]));
create policy stores_admin_read on public.stores for select to authenticated
using ((select private.has_platform_role('admin')));
create policy stores_member_update on public.stores for update to authenticated
using (private.can_manage_catalog(id)) with check (private.can_manage_catalog(id));

create policy memberships_self_read on public.store_memberships for select to authenticated
using (user_id = (select auth.uid()) and (select private.is_active_account()));
create policy memberships_manager_read on public.store_memberships for select to authenticated
using (private.has_store_role(store_id, array['owner','manager']::public.store_role[]));
create policy memberships_admin_read on public.store_memberships for select to authenticated
using ((select private.has_platform_role('admin')));

create policy items_public_read on public.menu_items for select to anon, authenticated
using (is_published and archived_at is null and private.is_public_store(store_id));
create policy items_member_read on public.menu_items for select to authenticated
using (private.has_store_role(store_id, array['owner','manager','staff']::public.store_role[]));
create policy items_admin_read on public.menu_items for select to authenticated
using ((select private.has_platform_role('admin')));
create policy items_member_insert on public.menu_items for insert to authenticated
with check (private.can_manage_catalog(store_id));
create policy items_member_update on public.menu_items for update to authenticated
using (private.can_manage_catalog(store_id)) with check (private.can_manage_catalog(store_id));

create trigger stores_updated_at before update on public.stores for each row execute function private.touch_updated_at();
create trigger memberships_updated_at before update on public.store_memberships for each row execute function private.touch_updated_at();
create trigger items_updated_at before update on public.menu_items for each row execute function private.touch_updated_at();
create trigger stores_access_audit after insert or update or delete on public.stores for each row execute function private.audit_access_change();
create trigger memberships_access_audit after insert or update or delete on public.store_memberships for each row execute function private.audit_access_change();

create function public.get_my_application_roles() returns text[]
language sql stable security definer set search_path = '' as $$
  select case when not private.is_active_account() then array[]::text[] else
    array['customer']::text[] ||
    case when exists (select 1 from public.store_memberships where user_id = auth.uid() and is_active)
      then array['merchant']::text[] else array[]::text[] end ||
    coalesce((select array_agg(role::text order by role::text) from private.platform_roles where user_id = auth.uid()), array[]::text[])
  end;
$$;
revoke all on function public.get_my_application_roles() from public, anon, authenticated;
grant execute on function public.get_my_application_roles() to authenticated;

commit;
