-- 20260930000300_cascade_user_deletions.sql
-- Enables clean user deletion from Supabase Dashboard / Admin API by cascading deletions
-- from auth.users -> public.profiles -> private.platform_roles and public.store_memberships.

begin;

alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;

alter table private.platform_roles
  drop constraint if exists platform_roles_user_id_fkey,
  add constraint platform_roles_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.store_memberships
  drop constraint if exists store_memberships_user_id_fkey,
  add constraint store_memberships_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

commit;
