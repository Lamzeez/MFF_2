-- Migration: 20261001000400_community_feed.sql
-- Purpose: Real Foodie Community Feed, Reviews, Ratings, Comments, and Likes backed by Supabase with Realtime.

begin;

-- 1. Community Posts Table
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null check (char_length(author_name) > 0),
  content text not null check (char_length(content) > 0),
  tagged_restaurant text not null default '',
  tagged_dish text not null default '',
  rating integer not null default 5 check (rating >= 1 and rating <= 5),
  image_url text default '',
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger for updated_at
drop trigger if exists set_community_posts_updated_at on public.community_posts;
create trigger set_community_posts_updated_at
before update on public.community_posts
for each row execute function private.touch_updated_at();

create index if not exists community_posts_created_at_idx on public.community_posts(created_at desc);
create index if not exists community_posts_author_idx on public.community_posts(author_id);

-- 2. Community Likes Table
create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 3. Community Comments Table
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null check (char_length(author_name) > 0),
  text text not null check (char_length(text) > 0),
  created_at timestamptz not null default now()
);

create index if not exists community_comments_post_idx on public.community_comments(post_id, created_at asc);

-- 4. Enable Row Level Security
alter table public.community_posts enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_comments enable row level security;

-- Posts Policies: Allow public/guest reading; authenticated writing
drop policy if exists community_posts_select on public.community_posts;
create policy community_posts_select on public.community_posts for select to anon, authenticated
using (true);

drop policy if exists community_posts_insert on public.community_posts;
create policy community_posts_insert on public.community_posts for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (select private.is_active_account())
);

drop policy if exists community_posts_update on public.community_posts;
create policy community_posts_update on public.community_posts for update to authenticated
using (
  author_id = (select auth.uid())
  or (select private.has_platform_role('admin'))
);

drop policy if exists community_posts_delete on public.community_posts;
create policy community_posts_delete on public.community_posts for delete to authenticated
using (
  author_id = (select auth.uid())
  or (select private.has_platform_role('admin'))
);

-- Likes Policies
drop policy if exists community_likes_select on public.community_likes;
create policy community_likes_select on public.community_likes for select to anon, authenticated
using (true);

drop policy if exists community_likes_insert on public.community_likes;
create policy community_likes_insert on public.community_likes for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists community_likes_delete on public.community_likes;
create policy community_likes_delete on public.community_likes for delete to authenticated
using (user_id = (select auth.uid()));

-- Comments Policies
drop policy if exists community_comments_select on public.community_comments;
create policy community_comments_select on public.community_comments for select to anon, authenticated
using (true);

drop policy if exists community_comments_insert on public.community_comments;
create policy community_comments_insert on public.community_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (select private.is_active_account())
);

drop policy if exists community_comments_delete on public.community_comments;
create policy community_comments_delete on public.community_comments for delete to authenticated
using (
  author_id = (select auth.uid())
  or (select private.has_platform_role('admin'))
);

-- 5. Atomic RPC: Toggle Post Like
create or replace function public.toggle_post_like(p_post_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_liked boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if exists (select 1 from public.community_likes where post_id = p_post_id and user_id = v_user_id) then
    delete from public.community_likes where post_id = p_post_id and user_id = v_user_id;
    update public.community_posts set likes_count = greatest(0, likes_count - 1) where id = p_post_id;
    v_liked := false;
  else
    insert into public.community_likes (post_id, user_id) values (p_post_id, v_user_id);
    update public.community_posts set likes_count = likes_count + 1 where id = p_post_id;
    v_liked := true;
  end if;

  return v_liked;
end;
$$;

revoke all on function public.toggle_post_like(uuid) from public, anon;
grant execute on function public.toggle_post_like(uuid) to authenticated;

-- 6. Add to Supabase Realtime Publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'community_posts'
  ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'community_comments'
  ) then
    alter publication supabase_realtime add table public.community_comments;
  end if;
end $$;

-- 7. Seed Initial Mati Foodie Reviews
do $$
declare
  v_author_id uuid;
  v_p1_id uuid;
  v_p2_id uuid;
begin
  select id into v_author_id from public.profiles limit 1;
  if v_author_id is not null then
    -- Check if posts already exist
    if not exists (select 1 from public.community_posts limit 1) then
      insert into public.community_posts (
        id, author_id, author_name, content, tagged_restaurant, tagged_dish, rating, image_url, likes_count
      ) values (
        '10000000-0000-0000-0000-000000000001',
        v_author_id,
        'Rico Alcantara',
        'Just had the freshly grilled Tuna Panga at Mati Baywalk Seafood Grill! Super juicy, perfectly seasoned with calamansi and grilled right by the bay. Dipping it into the spicy soy sauce is unmatched! 🐟🔥',
        'Mati Baywalk Seafood Grill',
        'Tuna Panga Grill',
        5,
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80',
        18
      ) returning id into v_p1_id;

      insert into public.community_comments (post_id, author_id, author_name, text)
      values 
        (v_p1_id, v_author_id, 'Bea Santos', 'Lami kaayo na ilaha timpla! Did you get their kinilaw as well?'),
        (v_p1_id, v_author_id, 'Mark Matias', 'Sulit gyud diha pag gabii kay presko ang hangin!');

      insert into public.community_posts (
        id, author_id, author_name, content, tagged_restaurant, tagged_dish, rating, image_url, likes_count
      ) values (
        '20000000-0000-0000-0000-000000000002',
        v_author_id,
        'Carla Mae Tan',
        'Sulit lunchtime at Mama Letty''s Karenderia! For only ₱90, their Classic Pork Humba is so tender it literally melts with your spoon. Plus unlimited sabaw! Best budget lunch in Mati City. 🍲',
        'Mama Letty''s Karenderia',
        'Classic Pork Humba',
        5,
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
        34
      ) returning id into v_p2_id;

      insert into public.community_comments (post_id, author_id, author_name, text)
      values 
        (v_p2_id, v_author_id, 'Jun-jun Mati', 'Diyan kami palagi nag lunch ng mga kasamahan ko sa trabaho! 👍');
    end if;
  end if;
end $$;

commit;
