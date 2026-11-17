-- Migration: 20261112000300_admin_delete_user.sql
-- Purpose: Provide System Admin RPC `admin_delete_user` to permanently delete a user account and all related data cleanly across auth.users, profiles, orders, reservations, community, and sole-owned stores.

begin;

create or replace function public.admin_delete_user(target_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid;
  v_owned_store_ids uuid[];
  v_deleted_stores int := 0;
begin
  perform private.require_admin();
  v_caller := auth.uid();

  if target_user is null then
    raise exception 'Target user ID is required' using errcode = '22023';
  end if;

  if target_user = v_caller then
    raise exception 'You cannot delete your own active administrator account' using errcode = '23514';
  end if;

  if not exists (
    select 1 from auth.users where id = target_user
  ) and not exists (
    select 1 from public.profiles where id = target_user
  ) then
    raise exception 'User account not found' using errcode = '22023';
  end if;

  if exists (
    select 1 from private.platform_roles
    where user_id = target_user and role = 'admin'
  ) then
    raise exception 'Revoke administrator role before deleting an administrator account' using errcode = '23514';
  end if;

  -- Identify stores where target_user is the sole active owner so we delete their data cleanly
  -- without tripping the active-owner constraint trigger.
  select coalesce(array_agg(sm.store_id), '{}'::uuid[])
  into v_owned_store_ids
  from public.store_memberships sm
  where sm.user_id = target_user
    and sm.is_active
    and sm.role = 'owner'
    and not exists (
      select 1
      from public.store_memberships other
      where other.store_id = sm.store_id
        and other.user_id <> target_user
        and other.is_active
        and other.role = 'owner'
    );

  -- Record explicit append-only admin audit event before deleting user rows.
  insert into private.access_audit_events (actor_id, action, entity_table, entity_key, old_access, new_access)
  values (
    v_caller,
    'DELETE_USER',
    'auth.users',
    jsonb_build_object('user_id', target_user, 'owned_store_ids', to_jsonb(v_owned_store_ids)),
    jsonb_build_object('existed', true),
    jsonb_build_object('deleted', true)
  );

  -- Detach courier and moderation references on third-party rows
  update public.orders set rider_id = null where rider_id = target_user;
  update public.order_reviews set rider_id = null where rider_id = target_user;
  update public.post_reports set reporter_id = null where reporter_id = target_user;
  update public.post_reports set resolved_by = null where resolved_by = target_user;

  -- Delete reviews, reservations, and orders for this user or their solely owned stores
  delete from public.order_reviews
  where customer_id = target_user
     or store_id = any(v_owned_store_ids);

  delete from public.table_reservations
  where customer_id = target_user
     or store_id = any(v_owned_store_ids);

  delete from public.orders
  where customer_id = target_user
     or store_id = any(v_owned_store_ids);

  -- Delete user's community posts/comments/likes/reports, vouchers, visits, and notifications
  delete from public.post_reports
  where post_id in (select id from public.community_posts where author_id = target_user);

  delete from public.community_likes where user_id = target_user;
  delete from public.community_comments where author_id = target_user;
  delete from public.community_posts where author_id = target_user;
  delete from public.voucher_redemptions where user_id = target_user;
  delete from public.store_visits
  where user_id = target_user
     or store_id = any(v_owned_store_ids);
  delete from public.notifications where user_id = target_user;
  delete from public.remote_push_queue where recipient_id = target_user;

  -- Clean up stores exclusively owned by this user
  if cardinality(v_owned_store_ids) > 0 then
    delete from public.menu_items where store_id = any(v_owned_store_ids);
    delete from public.store_memberships where store_id = any(v_owned_store_ids);
    delete from public.stores where id = any(v_owned_store_ids);
    get diagnostics v_deleted_stores = row_count;
  end if;

  -- Delete user memberships/roles/profile & Auth account (cascading sessions/identities)
  delete from public.store_memberships where user_id = target_user;
  delete from private.platform_roles where user_id = target_user;
  delete from public.profiles where id = target_user;
  delete from auth.users where id = target_user;

  return jsonb_build_object(
    'success', true,
    'deleted_user_id', target_user,
    'deleted_stores_count', v_deleted_stores
  );
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

commit;
