-- Migration: 20261002000200_foodie_uploads_storage.sql
-- Description: Create public storage bucket foodie-uploads for customer dish photos and merchant assets

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'foodie-uploads',
  'foodie-uploads',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 1. Public Read Policy
DROP POLICY IF EXISTS "Public can view foodie uploads" ON storage.objects;
CREATE POLICY "Public can view foodie uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'foodie-uploads');

-- 2. Authenticated Upload Policy
DROP POLICY IF EXISTS "Authenticated users can upload to foodie-uploads" ON storage.objects;
CREATE POLICY "Authenticated users can upload to foodie-uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'foodie-uploads');

-- 3. Owner Update & Delete Policy
DROP POLICY IF EXISTS "Users can update their own foodie uploads" ON storage.objects;
CREATE POLICY "Users can update their own foodie uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'foodie-uploads' AND (owner_id = (SELECT auth.uid()::text) OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)));

DROP POLICY IF EXISTS "Users can delete their own foodie uploads" ON storage.objects;
CREATE POLICY "Users can delete their own foodie uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'foodie-uploads' AND (owner_id = (SELECT auth.uid()::text) OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)));
