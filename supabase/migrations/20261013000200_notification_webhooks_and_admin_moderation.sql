-- ========================================================================
-- Migration: 20261013000200_notification_webhooks_and_admin_moderation.sql
-- Purpose: 
--   1. Remote Push Notification Outbox & Dispatch Queue
--   2. Community Post Moderation, Post Reports & Content Suppression
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. Remote Push Notification Outbox Table
-- ------------------------------------------------------------------------
create table if not exists public.remote_push_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_remote_push_queue_status on public.remote_push_queue(status, created_at);

alter table public.remote_push_queue enable row level security;

-- Only admins and system services can read or mutate the push queue
drop policy if exists remote_push_queue_admin on public.remote_push_queue;
create policy remote_push_queue_admin on public.remote_push_queue
  for all to authenticated
  using (private.has_platform_role('admin'))
  with check (private.has_platform_role('admin'));

-- ------------------------------------------------------------------------
-- 2. Community Post Visibility & Post Reports Table
-- ------------------------------------------------------------------------

-- Add is_hidden flag to community_posts if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'community_posts' and column_name = 'is_hidden'
  ) then
    alter table public.community_posts add column is_hidden boolean not null default false;
  end if;
end $$;

-- Update SELECT policy for community_posts: Hide suppressed posts from public view
drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts 
  for select to anon, authenticated
  using (
    is_hidden = false 
    or (select private.has_platform_role('admin'))
  );

-- Create post_reports table
create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null check (char_length(reason) > 0),
  details text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  action_taken text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_post_reports_status on public.post_reports(status, created_at desc);

alter table public.post_reports enable row level security;

-- Authenticated users can submit reports
drop policy if exists post_reports_insert on public.post_reports;
create policy post_reports_insert on public.post_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (select private.is_active_account())
  );

-- Admins can view and manage all reports
drop policy if exists post_reports_admin on public.post_reports;
create policy post_reports_admin on public.post_reports
  for all to authenticated
  using (private.has_platform_role('admin'))
  with check (private.has_platform_role('admin'));

-- ------------------------------------------------------------------------
-- 3. Stored Procedures / RPCs for Reporting & Moderation
-- ------------------------------------------------------------------------

-- Customer submits a report on an inappropriate review/post
create or replace function public.report_community_post(
  p_post_id uuid,
  p_reason text,
  p_details text default null
)
returns public.post_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.post_reports;
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.community_posts where id = p_post_id) then
    raise exception 'Post not found' using errcode = 'P0002';
  end if;

  insert into public.post_reports (
    post_id,
    reporter_id,
    reason,
    details,
    status
  ) values (
    p_post_id,
    v_caller_id,
    p_reason,
    p_details,
    'pending'
  )
  returning * into v_report;

  return v_report;
end;
$$;

revoke all on function public.report_community_post(uuid, text, text) from public, anon;
grant execute on function public.report_community_post(uuid, text, text) to authenticated;

-- Admin applies moderation action (hide, delete, dismiss)
create or replace function public.moderate_community_post(
  p_report_id uuid,
  p_action text
)
returns public.post_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.post_reports;
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not private.has_platform_role('admin') then
    raise exception 'Admin privileges required' using errcode = '42501';
  end if;

  select * into v_report from public.post_reports where id = p_report_id for update;
  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  if p_action = 'delete' then
    delete from public.community_posts where id = v_report.post_id;
    update public.post_reports
    set status = 'resolved',
        action_taken = 'deleted',
        resolved_by = v_caller_id,
        resolved_at = now()
    where id = p_report_id
    returning * into v_report;

  elsif p_action = 'hide' then
    update public.community_posts
    set is_hidden = true
    where id = v_report.post_id;

    update public.post_reports
    set status = 'resolved',
        action_taken = 'hidden',
        resolved_by = v_caller_id,
        resolved_at = now()
    where id = p_report_id
    returning * into v_report;

  elsif p_action = 'dismiss' then
    update public.post_reports
    set status = 'dismissed',
        action_taken = 'dismissed',
        resolved_by = v_caller_id,
        resolved_at = now()
    where id = p_report_id
    returning * into v_report;

  else
    raise exception 'Invalid moderation action: %', p_action using errcode = '22023';
  end if;

  return v_report;
end;
$$;

revoke all on function public.moderate_community_post(uuid, text) from public, anon;
grant execute on function public.moderate_community_post(uuid, text) to authenticated;
