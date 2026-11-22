-- Migration: 20261118000100_create_second_system_admin.sql
-- Description: Provision a second System Administrator user for MFF platform administration

begin;

-- 1. Insert into auth.users with encrypted password
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  reauthentication_token, phone_change, phone_change_token, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000098',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin2@mati-foodfinder.com',
  extensions.crypt('MatiAdmin2026#2', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"MFF System Admin 2","contact_phone":"09170000002"}'::jsonb,
  null, false, false, '', '', '', '', '', '', '', now(), now()
) on conflict (id) do update set
  email = 'admin2@mati-foodfinder.com',
  encrypted_password = extensions.crypt('MatiAdmin2026#2', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  raw_user_meta_data = '{"display_name":"MFF System Admin 2","contact_phone":"09170000002"}'::jsonb,
  is_super_admin = null;

-- 2. Insert into public.profiles
insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000098', 'MFF System Admin 2', '09170000002', 'active')
on conflict (id) do update set
  display_name = 'MFF System Admin 2',
  contact_phone = '09170000002',
  account_status = 'active';

-- 3. Insert into private.platform_roles with 'admin' role
insert into private.platform_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000098', 'admin')
on conflict (user_id, role) do nothing;

-- 4. Ensure auth.identities record exists for GoTrue password authentication
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
where u.id = '00000000-0000-0000-0000-000000000098'
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

commit;
