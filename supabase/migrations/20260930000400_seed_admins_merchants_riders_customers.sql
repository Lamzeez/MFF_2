-- Migration: Seed System Admin, dedicated Store Owners, Riders, and Customers with identities
-- New seed users receive random passwords; provision access through Supabase Auth password recovery.
-- Existing user passwords are preserved. Never store account passwords in migrations.
begin;

-- ============================================================================
-- 1. SYSTEM ADMINISTRATOR
-- ============================================================================
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000099',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"MFF System Admin","contact_phone":"09170000000"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000099', 'MFF System Admin', '09170000000', 'active')
on conflict (id) do update set display_name = 'MFF System Admin', contact_phone = '09170000000', account_status = 'active';

insert into private.platform_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000099', 'admin')
on conflict (user_id, role) do nothing;


-- ============================================================================
-- 2. STORE OWNERS / MERCHANTS
-- ============================================================================

-- Store 2: Ramon (Mati Baywalk Seafood Grill)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'merchant.baywalk@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Ramon Baywalk","contact_phone":"09283456789"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000012', 'Ramon Baywalk', '09283456789', 'active')
on conflict (id) do update set display_name = 'Ramon Baywalk', contact_phone = '09283456789', account_status = 'active';

insert into public.store_memberships (store_id, user_id, role, is_active)
values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000012', 'owner', true)
on conflict (store_id, user_id) do update set role = 'owner', is_active = true;


-- Store 3: Eddie (Subangan Street Grills)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'merchant.subangan@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Eddie Subangan","contact_phone":"09394567890"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000013', 'Eddie Subangan', '09394567890', 'active')
on conflict (id) do update set display_name = 'Eddie Subangan', contact_phone = '09394567890', account_status = 'active';

insert into public.store_memberships (store_id, user_id, role, is_active)
values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000013', 'owner', true)
on conflict (store_id, user_id) do update set role = 'owner', is_active = true;


-- Store 4: Chloe (Dahican Beach Bites)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'merchant.dahican@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Chloe Dahican","contact_phone":"09085678901"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000014', 'Chloe Dahican', '09085678901', 'active')
on conflict (id) do update set display_name = 'Chloe Dahican', contact_phone = '09085678901', account_status = 'active';

insert into public.store_memberships (store_id, user_id, role, is_active)
values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000014', 'owner', true)
on conflict (store_id, user_id) do update set role = 'owner', is_active = true;


-- Store 5: Aling Nena (Aling Nena's Kitchen)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'merchant.nena@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Aling Nena","contact_phone":"09196789012"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000015', 'Aling Nena', '09196789012', 'active')
on conflict (id) do update set display_name = 'Aling Nena', contact_phone = '09196789012', account_status = 'active';

insert into public.store_memberships (store_id, user_id, role, is_active)
values ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000015', 'owner', true)
on conflict (store_id, user_id) do update set role = 'owner', is_active = true;

-- Remove Mama Letty's duplicate placeholder ownership from stores 2-5 now that real owners exist
delete from public.store_memberships
where user_id = '00000000-0000-0000-0000-000000000001'
  and store_id in (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  );


-- ============================================================================
-- 3. RIDERS / DRIVERS
-- ============================================================================

-- Rider 2: Pedro Express
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000022',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'rider.pedro@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Pedro Express","contact_phone":"09182345678"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000022', 'Pedro Express', '09182345678', 'active')
on conflict (id) do update set display_name = 'Pedro Express', contact_phone = '09182345678', account_status = 'active';

insert into private.platform_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000022', 'rider')
on conflict (user_id, role) do nothing;


-- Rider 3: Maria Delivery
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000023',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'rider.maria@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Maria Delivery","contact_phone":"09183456789"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000023', 'Maria Delivery', '09183456789', 'active')
on conflict (id) do update set display_name = 'Maria Delivery', contact_phone = '09183456789', account_status = 'active';

insert into private.platform_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000023', 'rider')
on conflict (user_id, role) do nothing;


-- ============================================================================
-- 4. REGISTERED CUSTOMERS (Verified Mati Foodies)
-- ============================================================================

-- Customer 1: Carlos Mendoza
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'customer.carlos@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Carlos Mendoza","contact_phone":"09171112233"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000031', 'Carlos Mendoza', '09171112233', 'active')
on conflict (id) do update set display_name = 'Carlos Mendoza', contact_phone = '09171112233', account_status = 'active';


-- Customer 2: Bea Alonzo Santos
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000032',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'customer.bea@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Bea Alonzo Santos","contact_phone":"09172223344"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000032', 'Bea Alonzo Santos', '09172223344', 'active')
on conflict (id) do update set display_name = 'Bea Alonzo Santos', contact_phone = '09172223344', account_status = 'active';


-- Customer 3: Miguel Tan
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000033',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'customer.miguel@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Miguel Tan","contact_phone":"09173334455"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  is_super_admin = null;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000033', 'Miguel Tan', '09173334455', 'active')
on conflict (id) do update set display_name = 'Miguel Tan', contact_phone = '09173334455', account_status = 'active';


-- ============================================================================
-- 5. ENSURE IDENTITIES FOR SUPABASE GOTRUE AUTH
-- ============================================================================
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id::text,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from auth.users u
where not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

commit;
