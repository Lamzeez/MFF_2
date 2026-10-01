-- Seed initial Mati City stores, owners, rider, and menu items.
-- New seed users receive random passwords; provision access through Supabase Auth password recovery.
-- Existing user passwords are preserved. Never store account passwords in migrations.
-- Fulfills the stores_require_owner constraint.
begin;

-- 1. Seed Owner Account in auth.users
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'merchant.letty@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Mama Letty","contact_phone":"09172345678"}'::jsonb,
  false,
  false,
  false,
  now(),
  now()
) on conflict (id) do nothing;

-- Ensure profile exists (bootstrap trigger handles this, on conflict is fallback)
insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000001', 'Mama Letty', '09172345678', 'active')
on conflict (id) do update set display_name = 'Mama Letty', account_status = 'active';

-- 2. Seed Rider Account in auth.users
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'rider.juan@mati-foodfinder.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Juan Rider","contact_phone":"09181234567"}'::jsonb,
  false,
  false,
  false,
  now(),
  now()
) on conflict (id) do nothing;

insert into public.profiles (id, display_name, contact_phone, account_status)
values ('00000000-0000-0000-0000-000000000002', 'Juan Rider', '09181234567', 'active')
on conflict (id) do update set display_name = 'Juan Rider', account_status = 'active';

insert into private.platform_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000002', 'rider')
on conflict (user_id, role) do nothing;

-- 3. Insert Stores
insert into public.stores (
  id, name, slug, description, public_phone, address_text, barangay, location, approval_status, delivery_enabled
) values (
  '11111111-1111-1111-1111-111111111111',
  'Mama Letty''s Karenderia',
  'mama-lettys-karenderia',
  'Beloved neighborhood karenderia famed for slow-cooked Classic Pork Humba, native tinola, and unlimited sabaw for Mati residents and workers.',
  '+63 917 234 5678',
  'Magsaysay St, Brgy. Central, Mati City',
  'Central',
  extensions.st_point(126.2165, 6.9550)::extensions.geography,
  'approved',
  true
) on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  approval_status = 'approved',
  delivery_enabled = true;

insert into public.stores (
  id, name, slug, description, public_phone, address_text, barangay, location, approval_status, delivery_enabled
) values (
  '22222222-2222-2222-2222-222222222222',
  'Mati Baywalk Seafood Grill',
  'mati-baywalk-seafood-grill',
  'Premier bayside grill serving fresh morning catches of Tuna Panga, blue marlin, and grilled squid with sea breeze dining overlooking Pujada Bay.',
  '+63 928 345 6789',
  'Baywalk Boulevard, Pujada Bay, Mati City',
  'Central',
  extensions.st_point(126.2250, 6.9490)::extensions.geography,
  'approved',
  true
) on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  approval_status = 'approved',
  delivery_enabled = true;

insert into public.stores (
  id, name, slug, description, public_phone, address_text, barangay, location, approval_status, delivery_enabled
) values (
  '33333333-3333-3333-3333-333333333333',
  'Subangan Street Grills',
  'subangan-street-grills',
  'Locals'' top evening hangout for sizzling pork skewers, isaw, chicken inasal, and sweet spicy local dipping vinegar.',
  '+63 939 456 7890',
  'Near Subangan Museum Grounds, Mati City',
  'Sainz',
  extensions.st_point(126.2200, 6.9600)::extensions.geography,
  'approved',
  true
) on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  approval_status = 'approved',
  delivery_enabled = true;

insert into public.stores (
  id, name, slug, description, public_phone, address_text, barangay, location, approval_status, delivery_enabled
) values (
  '44444444-4444-4444-4444-444444444444',
  'Dahican Beach Bites',
  'dahican-beach-bites',
  'Beachfront surf spot serving fresh kinilaw, fruit smoothies, halo-halo, and sandwiches right next to Dahican''s famous waves.',
  '+63 908 567 8901',
  'Dahican Beach Coastline, Mati City',
  'Dahican',
  extensions.st_point(126.2750, 6.9180)::extensions.geography,
  'approved',
  true
) on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  approval_status = 'approved',
  delivery_enabled = true;

insert into public.stores (
  id, name, slug, description, public_phone, address_text, barangay, location, approval_status, delivery_enabled
) values (
  '55555555-5555-5555-5555-555555555555',
  'Aling Nena''s Kitchen',
  'aling-nenas-kitchen',
  'Comfort food kitchen specializing in hearty Native Chicken Tinola, Bulalo, and traditional Davao Oriental specialties.',
  '+63 919 678 9012',
  'Rizal Extension, Brgy. Sainz, Mati City',
  'Sainz',
  extensions.st_point(126.2190, 6.9580)::extensions.geography,
  'approved',
  true
) on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  approval_status = 'approved',
  delivery_enabled = true;

-- 4. Assign Owner Memberships to Satisfy stores_require_owner Constraint
insert into public.store_memberships (store_id, user_id, role, is_active)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'owner', true),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'owner', true),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'owner', true),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'owner', true),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000001', 'owner', true)
on conflict (store_id, user_id) do update set role = 'owner', is_active = true;

-- 5. Seed Menu Items
insert into public.menu_items (store_id, name, description, price_centavos, currency, is_published, is_available)
values
  -- Mama Letty's
  ('11111111-1111-1111-1111-111111111111', 'Classic Pork Humba', 'Signature tender pork belly braised in soy sauce, vinegar, black beans, and banana blossoms.', 9000, 'PHP', true, true),
  ('11111111-1111-1111-1111-111111111111', 'Native Tinola Sabaw', 'Free-range chicken simmered in ginger broth with green papaya and fresh chili leaves.', 8500, 'PHP', true, true),
  ('11111111-1111-1111-1111-111111111111', 'Steamed Rice (Unlimited)', 'Fragrant white rice with unlimited sabaw refill.', 1500, 'PHP', true, true),

  -- Mati Baywalk
  ('22222222-2222-2222-2222-222222222222', 'Tuna Panga Grill', 'Charcoal-grilled tuna jaw glazed with sweet-savory calamansi barbecue basting.', 28000, 'PHP', true, true),
  ('22222222-2222-2222-2222-222222222222', 'Grilled Stuffed Squid', 'Fresh ocean squid stuffed with onions, ripe tomatoes, and herbs, char-grilled to perfection.', 22000, 'PHP', true, true),
  ('22222222-2222-2222-2222-222222222222', 'Sinigang na Lapu-Lapu', 'Sour tamarind broth with fresh reef fish, kangkong, and local vegetables.', 25000, 'PHP', true, true),

  -- Subangan Street Grills
  ('33333333-3333-3333-3333-333333333333', 'Pork BBQ Skewers (3pcs)', 'Smoky skewered pork slices marinated in traditional spiced banana ketchup sauce.', 7500, 'PHP', true, true),
  ('33333333-3333-3333-3333-333333333333', 'Chicken Inasal Quarter Leg', 'Bacolod-style grilled chicken basted with annatto oil, lemongrass, and native vinegar.', 11000, 'PHP', true, true),
  ('33333333-3333-3333-3333-333333333333', 'Grilled Isaw Platter', 'Crispy skewered chicken intestines charred over high coals, served with sinamak dip.', 4500, 'PHP', true, true),

  -- Dahican Beach Bites
  ('44444444-4444-4444-4444-444444444444', 'Fresh Kinilaw na Isda', 'Freshly landed yellowfin tuna ceviche cured in palm vinegar, calamansi, ginger, and coconut milk.', 16000, 'PHP', true, true),
  ('44444444-4444-4444-4444-444444444444', 'Dahican Special Halo-Halo', 'Crushed ice topped with ube halaya, leche flan, saba banana, and evaporated milk.', 9500, 'PHP', true, true),
  ('44444444-4444-4444-4444-444444444444', 'Mango Graham Smoothie', 'Chilled sweet Mati mango shake layered with crushed graham and sweet cream.', 8000, 'PHP', true, true),

  -- Aling Nena's
  ('55555555-5555-5555-5555-555555555555', 'Native Chicken Tinola', 'Hearty traditional soup with native free-range chicken and fresh malunggay.', 12000, 'PHP', true, true),
  ('55555555-5555-5555-5555-555555555555', 'Special Beef Bulalo', 'Slow-boiled beef shank with marrow and cabbage in rich savory bone broth.', 22000, 'PHP', true, true);

commit;
