begin;

-- Create canonical order_status enum
create type public.order_status as enum (
  'placed',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

-- Sequence for human-readable order numbers (#MFF-1001, #MFF-1002, ...)
create sequence public.order_number_seq start 1001;
grant usage on sequence public.order_number_seq to authenticated;

-- Main Orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('MFF-' || nextval('public.order_number_seq')::text),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  rider_id uuid references public.profiles(id) on delete set null,
  status public.order_status not null default 'placed',
  fulfillment_type text not null default 'delivery' check (fulfillment_type in ('delivery', 'pickup')),
  payment_method text not null default 'cod' check (payment_method in ('cod', 'gcash')),
  subtotal_centavos integer not null check (subtotal_centavos >= 0),
  delivery_fee_centavos integer not null default 0 check (delivery_fee_centavos >= 0),
  total_centavos integer not null check (total_centavos >= 0),
  delivery_address text not null check (char_length(btrim(delivery_address)) > 0),
  barangay text not null check (char_length(btrim(barangay)) > 0),
  customer_phone text check (char_length(customer_phone) <= 32),
  notes text not null default '' check (char_length(notes) <= 1000),
  handshake_pin varchar(4) not null check (handshake_pin ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order Items table
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null check (char_length(btrim(item_name)) between 1 and 160),
  price_centavos integer not null check (price_centavos >= 0),
  quantity integer not null check (quantity > 0),
  subtotal_centavos integer not null check (subtotal_centavos >= 0),
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_store_idx on public.orders(store_id, status, created_at desc);
create index orders_rider_idx on public.orders(rider_id, status, created_at desc);
create index orders_available_jobs_idx on public.orders(status, created_at desc)
  where rider_id is null and status = 'ready_for_pickup' and fulfillment_type = 'delivery';
create index order_items_order_idx on public.order_items(order_id);

-- Updated_at trigger
create trigger orders_updated_at before update on public.orders
for each row execute function private.touch_updated_at();

-- Enable RLS
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders, public.order_items from public, anon, authenticated;
grant select, insert on public.orders to authenticated;
grant update (status, rider_id, notes) on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;

-- Policies for public.orders
create policy orders_select on public.orders for select to authenticated
using (
  -- 1. Customer who owns the order
  customer_id = (select auth.uid())
  -- 2. Store staff belonging to the order's store
  or exists (
    select 1 from public.store_memberships sm
    where sm.store_id = orders.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
  )
  -- 3. Rider assigned to this order
  or rider_id = (select auth.uid())
  -- 4. Rider browsing unassigned ready jobs
  or (
    (select private.has_platform_role('rider'))
    and status = 'ready_for_pickup'
    and rider_id is null
    and fulfillment_type = 'delivery'
  )
  -- 5. Platform administrator
  or (select private.has_platform_role('admin'))
);

create policy orders_insert on public.orders for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and (select private.is_active_account())
);

create policy orders_update on public.orders for update to authenticated
using (
  -- Store staff managing orders
  exists (
    select 1 from public.store_memberships sm
    where sm.store_id = orders.store_id
      and sm.user_id = (select auth.uid())
      and sm.is_active = true
  )
  -- Assigned rider or rider claiming job
  or (
    (select private.has_platform_role('rider'))
    and (
      rider_id = (select auth.uid())
      or (rider_id is null and status = 'ready_for_pickup')
    )
  )
  -- Customer cancelling placed order
  or (
    customer_id = (select auth.uid())
    and status = 'placed'
  )
  -- Platform admin
  or (select private.has_platform_role('admin'))
);

-- Policies for public.order_items
create policy order_items_select on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
  )
);

create policy order_items_insert on public.order_items for insert to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = (select auth.uid())
  )
);

-- Atomic RPC: Rider claims delivery job
create or replace function public.claim_delivery_job(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  if not private.has_platform_role('rider') then
    raise exception 'Rider role required' using errcode = '42501';
  end if;

  update public.orders
  set rider_id = auth.uid(),
      status = 'out_for_delivery'
  where id = p_order_id
    and status = 'ready_for_pickup'
    and rider_id is null
    and fulfillment_type = 'delivery'
  returning * into v_order;

  if not found then
    raise exception 'Order is no longer available for delivery' using errcode = 'P0002';
  end if;

  return v_order;
end;
$$;

revoke all on function public.claim_delivery_job(uuid) from public, anon, authenticated;
grant execute on function public.claim_delivery_job(uuid) to authenticated;

-- Atomic RPC: Verify delivery completion via PIN
create or replace function public.complete_delivery_with_pin(p_order_id uuid, p_pin text)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.rider_id <> auth.uid() and not private.has_platform_role('admin') then
    raise exception 'Only assigned rider can complete delivery' using errcode = '42501';
  end if;

  if v_order.status <> 'out_for_delivery' then
    raise exception 'Order is not out for delivery' using errcode = '22023';
  end if;

  if v_order.handshake_pin <> btrim(p_pin) then
    raise exception 'Invalid delivery handshake PIN' using errcode = '22023';
  end if;

  update public.orders
  set status = 'delivered'
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.complete_delivery_with_pin(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_delivery_with_pin(uuid, text) to authenticated;

-- Realtime broadcast for orders
alter publication supabase_realtime add table public.orders;

commit;
