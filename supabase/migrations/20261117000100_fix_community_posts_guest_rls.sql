-- Fix Community Posts RLS for Anonymous Guest Users
-- Root cause: Migration 20261013000200 defined community_posts_select for (anon, authenticated)
-- using `is_hidden = false or (select private.has_platform_role('admin'))`.
-- Because private.has_platform_role is revoked from anon, Postgres threw:
-- 42501 permission denied for function has_platform_role whenever unauthenticated guests queried the feed.

-- 1. Grant execute on private.is_active_account and private.has_platform_role to anon
-- (When auth.uid() is null for anon, both functions safely return false without throwing permission denied)
grant execute on function private.is_active_account() to anon;
grant execute on function private.has_platform_role(public.platform_role) to anon;

-- 2. Drop the combined policy and cleanly split into anon and authenticated policies
drop policy if exists community_posts_select on public.community_posts;
drop policy if exists community_posts_select_anon on public.community_posts;
drop policy if exists community_posts_select_authenticated on public.community_posts;

-- Allow anonymous guests to read non-hidden posts cleanly without role checks
create policy community_posts_select_anon on public.community_posts
  for select to anon
  using (is_hidden = false);

-- Allow authenticated users to read non-hidden posts, or all posts if platform admin
create policy community_posts_select_authenticated on public.community_posts
  for select to authenticated
  using (
    is_hidden = false
    or (select private.has_platform_role('admin'))
  );
