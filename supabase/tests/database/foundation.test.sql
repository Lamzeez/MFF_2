-- Execute only against the disposable local Supabase database via `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- Auth fixtures are transaction-scoped, not production seeds or prototype imports.
insert into auth.users(id, email, raw_user_meta_data, is_anonymous)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'foundation-' || n || '@example.invalid', '{"role":"admin","account_status":"active"}'::jsonb, n = 8
from generate_series(1, 8) n;
insert into private.platform_roles(user_id, role) values
  ('00000000-0000-0000-0000-000000000005', 'admin'),
  ('00000000-0000-0000-0000-000000000006', 'rider');
insert into public.stores(id, name, slug, address_text, approval_status, archived_at) values
  ('10000000-0000-0000-0000-000000000001', 'A', 'store-a', 'Mati', 'approved', null),
  ('10000000-0000-0000-0000-000000000002', 'B', 'store-b', 'Mati', 'approved', null),
  ('10000000-0000-0000-0000-000000000003', 'Pending', 'store-pending', 'Mati', 'pending', null),
  ('10000000-0000-0000-0000-000000000004', 'Archived', 'store-archived', 'Mati', 'approved', now());
insert into public.store_memberships(store_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'staff'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', 'manager'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'owner'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'owner'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'owner');
insert into public.menu_items(id, store_id, name, price_centavos, is_published, is_available, archived_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A public', 9000, true, true, null),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'A draft', 9500, false, true, null),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'B public', 10000, true, true, null),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'Pending store item', 10000, true, true, null),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'A sold out', 9000, true, false, null),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 'Archived store item', 9000, true, true, null),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'Archived item', 9000, true, true, now());

select is((select count(*) from public.profiles where id::text like '00000000-%'), 8::bigint, 'Auth insert bootstraps one profile per user');
select is((select count(*) from private.platform_roles), 2::bigint, 'Signup metadata cannot grant roles');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private') and c.relname in ('profiles','platform_roles','access_audit_events','stores','store_memberships','menu_items') and c.relrowsecurity),
  6::bigint, 'All six foundation tables have RLS enabled');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='stores_location_gist' and indexdef like '%USING gist%'), 'Store geography has GiST index');
select is(extensions.st_srid(extensions.st_point(126.2168, 6.9552)::extensions.geography::extensions.geometry), 4326, 'Geography uses SRID 4326');

set local role anon;
select is((select count(*) from public.stores), 2::bigint, 'Guest sees approved unarchived stores only');
select is((select count(*) from public.menu_items), 3::bigint, 'Guest visibility checks item and parent store');
select is((select count(*) from public.menu_items where not is_available), 1::bigint, 'Sold-out published items remain discoverable');
select throws_ok('select * from public.profiles', '42501', null, 'Guest cannot read profiles');
select throws_ok('select * from public.store_memberships', '42501', null, 'Guest cannot read membership roster');
select throws_ok('select * from private.platform_roles', '42501', null, 'Private schema usage does not grant role reads');
select throws_ok('select * from private.access_audit_events', '42501', null, 'Guest cannot read audit events');
select throws_ok($$insert into public.stores(name,slug,address_text) values('X','x','Mati')$$, '42501', null, 'Guest cannot create stores');
select throws_ok('select public.get_my_application_roles()', '42501', null, 'Guest cannot call authenticated roles RPC');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.profiles), 1::bigint, 'Customer sees own profile only');
select is(public.get_my_application_roles(), array['customer']::text[], 'Customer has baseline access, not signup metadata privileges');
select lives_ok($$update public.profiles set display_name='Customer' where id=auth.uid()$$, 'Customer can edit own display name');
select is((select display_name from public.profiles where id=auth.uid()), 'Customer', 'Profile edit is persisted within transaction');
select throws_ok($$update public.profiles set account_status='suspended' where id=auth.uid()$$, '42501', null, 'Customer cannot edit protected account status');
select throws_ok($$update public.profiles set id='00000000-0000-0000-0000-000000000002' where id=auth.uid()$$, '42501', null, 'Profile identity cannot be reassigned');
with changed as (update public.profiles set display_name='Stolen' where id='00000000-0000-0000-0000-000000000002' returning id) select is(count(*), 0::bigint, 'Cross-user update affects no rows') from changed;
select throws_ok($$select public.admin_set_platform_role(auth.uid(),'admin',true)$$, '42501', null, 'Customer cannot self-promote through admin RPC');
select throws_ok($$insert into private.platform_roles(user_id,role) values(auth.uid(),'admin')$$, '42501', null, 'Customer cannot write roles directly');
select throws_ok($$insert into public.menu_items(store_id,name,price_centavos) values('10000000-0000-0000-0000-000000000001','Intruder',1)$$, '42501', null, 'Customer cannot create merchant catalog items');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.get_my_application_roles(), array['customer','merchant']::text[], 'Merchant capability derives from membership');
select is((select count(*) from public.menu_items where store_id='10000000-0000-0000-0000-000000000001'), 4::bigint, 'Owner sees own unpublished and archived items');
select is((select count(*) from public.store_memberships), 3::bigint, 'Owner can inspect own store roster only');
select lives_ok($$update public.stores set description='New description' where id='10000000-0000-0000-0000-000000000001'$$, 'Owner edits permitted store fields');
select is((select description from public.stores where id='10000000-0000-0000-0000-000000000001'), 'New description', 'Owner update actually changed its store');
select throws_ok($$update public.stores set approval_status='approved' where id='10000000-0000-0000-0000-000000000001'$$, '42501', null, 'Owner cannot change approval');
select throws_ok($$update public.store_memberships set role='owner'$$, '42501', null, 'Owner cannot directly change membership grants');
with changed as (update public.menu_items set price_centavos=1 where store_id='10000000-0000-0000-0000-000000000002' returning id) select is(count(*), 0::bigint, 'Owner cannot change another store item') from changed;
select throws_ok($$update public.menu_items set store_id='10000000-0000-0000-0000-000000000002' where id='20000000-0000-0000-0000-000000000001'$$, '42501', null, 'Item ownership cannot be relocated');
select throws_ok($$update public.menu_items set price_centavos=-1 where id='20000000-0000-0000-0000-000000000001'$$, '23514', null, 'Negative prices rejected');
select throws_ok($$insert into public.menu_items(store_id,name,price_centavos,currency) values('10000000-0000-0000-0000-000000000001','Wrong currency',100,'USD')$$, '23514', null, 'Foundation catalog currency is PHP');
select throws_ok($$delete from public.menu_items where id='20000000-0000-0000-0000-000000000001'$$, '42501', null, 'Catalog records must be archived, not deleted by clients');
select lives_ok($$insert into public.menu_items(store_id,name,price_centavos) values('10000000-0000-0000-0000-000000000001','New draft',15000)$$, 'Owner can add an item');
select ok((select not is_published and not is_available from public.menu_items where name='New draft'), 'New items default unpublished and unavailable');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is((select count(*) from public.store_memberships), 1::bigint, 'Staff sees own membership only');
with changed as (update public.menu_items set price_centavos=1 where store_id='10000000-0000-0000-0000-000000000001' returning id) select is(count(*), 0::bigint, 'Staff cannot edit catalog') from changed;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000007","role":"authenticated"}', true);
select lives_ok($$update public.menu_items set price_centavos=9100 where id='20000000-0000-0000-0000-000000000001'$$, 'Manager can edit own store catalog');
select is((select price_centavos from public.menu_items where id='20000000-0000-0000-0000-000000000001'), 9100, 'Manager update actually changed price');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
select is(public.get_my_application_roles(), array['customer','rider']::text[], 'Rider assignment adds no merchant permissions');
select is((select count(*) from public.store_memberships), 0::bigint, 'Rider cannot see merchant rosters');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000008","role":"authenticated"}', true);
select is(public.get_my_application_roles(), array[]::text[], 'Anonymous Auth identity gets no permanent customer capability');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select lives_ok($$select public.admin_set_account_status('00000000-0000-0000-0000-000000000002','suspended')$$, 'Admin can suspend an account');
select throws_ok($$select public.admin_set_platform_role('00000000-0000-0000-0000-000000000008','rider',true)$$, '22023', null, 'Cannot grant privileges to anonymous Auth account');
select throws_ok($$select public.admin_set_platform_role(auth.uid(),'admin',false)$$, '23514', null, 'Last active admin cannot remove own role');
select throws_ok($$select public.admin_set_account_status(auth.uid(),'suspended')$$, '23514', null, 'Last active admin cannot suspend self');
select lives_ok($$select public.admin_create_store('00000000-0000-0000-0000-000000000003','Created atomically','created-atomically','Mati')$$, 'Store and owner membership created atomically');
select lives_ok($$select public.admin_set_store_approval('10000000-0000-0000-0000-000000000003','approved')$$, 'Admin can approve a store');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(public.get_my_application_roles(), array[]::text[], 'Suspension takes effect without changing JWT');
select is((select count(*) from public.menu_items where name='A draft'), 0::bigint, 'Suspended member loses private catalog visibility');
with changed as (update public.menu_items set price_centavos=1 where store_id='10000000-0000-0000-0000-000000000001' returning id) select is(count(*), 0::bigint, 'Suspended member cannot mutate catalog') from changed;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select lives_ok($$select public.admin_set_store_membership('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000007','manager',false)$$, 'Admin can revoke membership');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000007","role":"authenticated"}', true);
select is(public.get_my_application_roles(), array['customer']::text[], 'Membership revocation is immediately authoritative');

set local role postgres;
set constraints all immediate;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.admin_set_store_membership('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','staff',true)$$, '23514', null, 'Last active owner membership cannot be demoted');
select lives_ok($$select public.admin_set_store_membership('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','owner',true)$$, 'Ownership transfer first adds the new owner');
select lives_ok($$select public.admin_set_store_membership('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','staff',true)$$, 'Old owner can then be demoted');
select throws_ok('select * from private.access_audit_events', '42501', null, 'Even an admin JWT has no raw audit table access');
set local role postgres;
select ok(exists(select 1 from private.access_audit_events where actor_id='00000000-0000-0000-0000-000000000005' and entity_table='public.profiles' and new_access->>'account_status'='suspended'), 'Privileged mutation records actor and status');
select throws_ok('delete from private.access_audit_events', '42501', null, 'Audit trail rejects destructive mutation');
select is((select count(*) from public.profiles where display_name='Stolen'), 0::bigint, 'Rejected cross-user update left no changes');
select * from finish();
rollback;
