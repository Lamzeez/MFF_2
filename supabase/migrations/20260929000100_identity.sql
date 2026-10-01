-- Foundation only. No prototype feature data is imported.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
-- USAGE allows policy helpers, not table reads. Never expose this schema via Data API.
alter default privileges in schema private revoke execute on functions from public;

create type public.account_status as enum ('active', 'suspended');
create type public.platform_role as enum ('admin', 'rider');
create type public.store_role as enum ('owner', 'manager', 'staff');
create type public.store_approval_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null default '' check (char_length(display_name) <= 120),
  contact_phone text check (char_length(contact_phone) <= 32),
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.platform_roles (
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.platform_role not null,
  primary key (user_id, role),
  granted_at timestamptz not null default now()
);

create table private.access_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid, -- Deliberately no FK: retain attribution after approved account erasure.
  database_actor text not null default session_user,
  action text not null,
  entity_table text not null,
  entity_key jsonb not null,
  old_access jsonb,
  new_access jsonb,
  occurred_at timestamptz not null default now()
);
create index access_audit_events_occurred_idx on private.access_audit_events(occurred_at);

alter table public.profiles enable row level security;
alter table private.platform_roles enable row level security;
alter table private.access_audit_events enable row level security;
revoke all on public.profiles from public, anon, authenticated;
revoke all on private.platform_roles, private.access_audit_events from public, anon, authenticated;
revoke all on sequence private.access_audit_events_id_seq from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, contact_phone) on public.profiles to authenticated;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;
create trigger profiles_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();

create function private.bootstrap_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Do not copy roles, account status, or other authority from signup metadata.
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function private.bootstrap_profile() from public, anon, authenticated;
create trigger mff_profile_created after insert on auth.users
for each row execute function private.bootstrap_profile();
-- Additive support if applied to a project with existing Auth users.
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;

create function private.is_active_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = (select auth.uid()) and p.account_status = 'active'
      and not coalesce(u.is_anonymous, false)
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;
create function private.has_platform_role(required_role public.platform_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active_account() and exists (
    select 1 from private.platform_roles r
    where r.user_id = (select auth.uid()) and r.role = required_role
  );
$$;
revoke all on function private.is_active_account(), private.has_platform_role(public.platform_role) from public, anon, authenticated;
grant execute on function private.is_active_account(), private.has_platform_role(public.platform_role) to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid()) and (select private.is_active_account()))
with check (id = (select auth.uid()) and (select private.is_active_account()));

-- Only access-control fields enter this audit trail; no full profile/contact copies.
create function private.audit_access_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  old_row jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_row jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  entity jsonb;
  before_access jsonb;
  after_access jsonb;
begin
  if tg_table_name = 'profiles' then
    entity := jsonb_build_object('id', coalesce(new_row, old_row)->'id');
    before_access := jsonb_build_object('account_status', old_row->'account_status');
    after_access := jsonb_build_object('account_status', new_row->'account_status');
  elsif tg_table_name = 'stores' then
    entity := jsonb_build_object('id', coalesce(new_row, old_row)->'id');
    before_access := jsonb_build_object('approval_status', old_row->'approval_status', 'archived_at', old_row->'archived_at');
    after_access := jsonb_build_object('approval_status', new_row->'approval_status', 'archived_at', new_row->'archived_at');
  elsif tg_table_name = 'store_memberships' then
    entity := jsonb_build_object('store_id', coalesce(new_row, old_row)->'store_id', 'user_id', coalesce(new_row, old_row)->'user_id');
    before_access := jsonb_build_object('role', old_row->'role', 'is_active', old_row->'is_active');
    after_access := jsonb_build_object('role', new_row->'role', 'is_active', new_row->'is_active');
  elsif tg_table_name = 'platform_roles' then
    entity := jsonb_build_object('user_id', coalesce(new_row, old_row)->'user_id', 'role', coalesce(new_row, old_row)->'role');
    before_access := case when old_row is null then null else jsonb_build_object('role', old_row->'role') end;
    after_access := case when new_row is null then null else jsonb_build_object('role', new_row->'role') end;
  else
    raise exception 'Unsupported audit source';
  end if;
  if tg_op <> 'UPDATE' or before_access is distinct from after_access then
    insert into private.access_audit_events(actor_id, action, entity_table, entity_key, old_access, new_access)
    values (auth.uid(), tg_op, tg_table_schema || '.' || tg_table_name, entity, before_access, after_access);
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_access_change() from public, anon, authenticated;
create trigger profiles_access_audit after update on public.profiles
for each row execute function private.audit_access_change();
create trigger platform_roles_access_audit after insert or update or delete on private.platform_roles
for each row execute function private.audit_access_change();

commit;
