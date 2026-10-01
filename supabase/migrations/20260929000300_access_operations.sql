begin;

-- Serialized access administration also makes last-owner decisions race-safe.
-- Internal helper is not executable directly by API roles.
create function private.require_admin() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(734621, 1);
  if not private.has_platform_role('admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.require_admin() from public, anon, authenticated;

create function private.require_active_target(target_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = target_user and p.account_status = 'active' and not coalesce(u.is_anonymous, false)
      and (u.banned_until is null or u.banned_until <= now())) then
    raise exception 'Target must be an active permanent account' using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.require_active_target(uuid) from public, anon, authenticated;

create function public.admin_set_platform_role(target_user uuid, target_role public.platform_role, enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if enabled is null then raise exception 'enabled is required' using errcode = '22023'; end if;
  if enabled then
    perform private.require_active_target(target_user);
    insert into private.platform_roles(user_id, role) values (target_user, target_role)
      on conflict (user_id, role) do nothing;
  else
    if target_role = 'admin' and exists(select 1 from private.platform_roles where user_id = target_user and role = 'admin')
      and not exists(select 1 from private.platform_roles r join public.profiles p on p.id = r.user_id join auth.users u on u.id = p.id
        where r.role = 'admin' and r.user_id <> target_user and p.account_status = 'active'
          and not coalesce(u.is_anonymous, false) and (u.banned_until is null or u.banned_until <= now())) then
      raise exception 'Cannot remove the last active administrator' using errcode = '23514';
    end if;
    delete from private.platform_roles where user_id = target_user and role = target_role;
  end if;
end;
$$;

create function public.admin_set_account_status(target_user uuid, new_status public.account_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if new_status = 'suspended' and exists(select 1 from private.platform_roles where user_id = target_user and role = 'admin')
    and not exists(select 1 from private.platform_roles r join public.profiles p on p.id = r.user_id join auth.users u on u.id = p.id
      where r.role = 'admin' and r.user_id <> target_user and p.account_status = 'active'
        and not coalesce(u.is_anonymous, false) and (u.banned_until is null or u.banned_until <= now())) then
    raise exception 'Cannot suspend the last active administrator' using errcode = '23514';
  end if;
  update public.profiles set account_status = new_status where id = target_user;
  if not found then raise exception 'Account not found' using errcode = '22023'; end if;
end;
$$;

create function public.admin_create_store(owner_user uuid, store_name text, store_slug text, store_address text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform private.require_admin();
  perform private.require_active_target(owner_user);
  insert into public.stores(name, slug, address_text) values (store_name, store_slug, store_address) returning id into new_id;
  insert into public.store_memberships(store_id, user_id, role) values (new_id, owner_user, 'owner');
  return new_id;
end;
$$;

create function public.admin_set_store_approval(target_store uuid, new_status public.store_approval_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.stores set approval_status = new_status where id = target_store;
  if not found then raise exception 'Store not found' using errcode = '22023'; end if;
end;
$$;

create function public.admin_set_store_archived(target_store uuid, archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if archived is null then raise exception 'archived is required' using errcode = '22023'; end if;
  update public.stores set archived_at = case when archived then coalesce(archived_at, now()) else null end where id = target_store;
  if not found then raise exception 'Store not found' using errcode = '22023'; end if;
end;
$$;

create function public.admin_set_store_membership(target_store uuid, target_user uuid, new_role public.store_role, active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if active then perform private.require_active_target(target_user); end if;
  perform 1 from public.stores where id = target_store for update;
  if not found then raise exception 'Store not found' using errcode = '22023'; end if;
  insert into public.store_memberships(store_id, user_id, role, is_active)
    values (target_store, target_user, new_role, active)
  on conflict (store_id, user_id) do update set role = excluded.role, is_active = excluded.is_active;
end;
$$;

-- Prevent ownership relocation even in privileged scripts. Transfers add a membership.
create function private.lock_membership_store() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.store_id <> old.store_id or new.user_id <> old.user_id) then
    raise exception 'Membership identity is immutable' using errcode = '23514';
  end if;
  perform 1 from public.stores where id = coalesce(new.store_id, old.store_id) for update;
  return coalesce(new, old);
end;
$$;
create function private.require_store_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
  affected_row jsonb := coalesce(to_jsonb(new), to_jsonb(old));
begin
  target := (affected_row ->> case when tg_table_name = 'stores' then 'id' else 'store_id' end)::uuid;
  perform 1 from public.stores where id = target for update;
  if exists(select 1 from public.stores where id = target and archived_at is null)
    and not exists(select 1 from public.store_memberships where store_id = target and is_active and role = 'owner') then
    raise exception 'An unarchived store must retain an active owner membership' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function private.lock_membership_store(), private.require_store_owner() from public, anon, authenticated;
create trigger membership_store_lock before insert or update or delete on public.store_memberships
for each row execute function private.lock_membership_store();
create constraint trigger memberships_require_owner after insert or update or delete on public.store_memberships
deferrable initially deferred for each row execute function private.require_store_owner();
create constraint trigger stores_require_owner after insert or update on public.stores
deferrable initially deferred for each row execute function private.require_store_owner();

create function private.reject_audit_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Access audit events are append-only' using errcode = '42501';
end;
$$;
revoke all on function private.reject_audit_mutation() from public, anon, authenticated;
create trigger access_audit_append_only before update or delete or truncate on private.access_audit_events
for each statement execute function private.reject_audit_mutation();

revoke all on function public.admin_set_platform_role(uuid, public.platform_role, boolean),
  public.admin_set_account_status(uuid, public.account_status), public.admin_create_store(uuid, text, text, text),
  public.admin_set_store_approval(uuid, public.store_approval_status), public.admin_set_store_archived(uuid, boolean),
  public.admin_set_store_membership(uuid, uuid, public.store_role, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_platform_role(uuid, public.platform_role, boolean),
  public.admin_set_account_status(uuid, public.account_status), public.admin_create_store(uuid, text, text, text),
  public.admin_set_store_approval(uuid, public.store_approval_status), public.admin_set_store_archived(uuid, boolean),
  public.admin_set_store_membership(uuid, uuid, public.store_role, boolean) to authenticated;

commit;
