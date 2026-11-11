-- Migration: 20261011000300_order_reviews.sql
-- Purpose: Schema, tables, RLS policies, and RPC functions for Post-Delivery Food & Courier Ratings in Mati City.

begin;

-- 1. Create order_reviews table
create table if not exists public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  rider_id uuid references public.profiles(id) on delete set null,
  food_rating integer not null check (food_rating >= 1 and food_rating <= 5),
  rider_rating integer check (rider_rating is null or (rider_rating >= 1 and rider_rating <= 5)),
  review_text text,
  rider_compliments text[] default '{}',
  posted_to_community boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for fast relational lookup
create index if not exists order_reviews_order_idx on public.order_reviews(order_id);
create index if not exists order_reviews_customer_idx on public.order_reviews(customer_id);
create index if not exists order_reviews_store_idx on public.order_reviews(store_id);
create index if not exists order_reviews_rider_idx on public.order_reviews(rider_id);

-- 3. Enable Row Level Security (RLS)
alter table public.order_reviews enable row level security;

-- 4. RLS Policies
drop policy if exists order_reviews_select_policy on public.order_reviews;
create policy order_reviews_select_policy on public.order_reviews for select
  to authenticated, anon
  using (true);

drop policy if exists order_reviews_insert_policy on public.order_reviews;
create policy order_reviews_insert_policy on public.order_reviews for insert
  to authenticated
  with check (customer_id = auth.uid());

-- 5. Helper RPC to calculate aggregate ratings for a rider
create or replace function public.get_rider_rating_summary(p_rider_id uuid)
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  v_avg numeric;
  v_count integer;
begin
  select
    coalesce(round(avg(rider_rating)::numeric, 1), 5.0),
    count(rider_rating)
  into v_avg, v_count
  from public.order_reviews
  where rider_id = p_rider_id and rider_rating is not null;

  return jsonb_build_object(
    'average_rating', coalesce(v_avg, 5.0),
    'total_reviews', coalesce(v_count, 0)
  );
end;
$$;

-- 6. Helper RPC to calculate aggregate ratings for a store
create or replace function public.get_store_rating_summary(p_store_id uuid)
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  v_avg numeric;
  v_count integer;
begin
  select
    coalesce(round(avg(food_rating)::numeric, 1), 5.0),
    count(food_rating)
  into v_avg, v_count
  from public.order_reviews
  where store_id = p_store_id;

  return jsonb_build_object(
    'average_rating', coalesce(v_avg, 5.0),
    'total_reviews', coalesce(v_count, 0)
  );
end;
$$;

commit;
