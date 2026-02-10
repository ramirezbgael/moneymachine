-- ============================================
-- Add image_url column to products table
-- ============================================
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment
COMMENT ON COLUMN products.image_url IS 'URL or base64 data URL of the product image';

-- ============================================
-- Create Storage Bucket for Product Images
-- ============================================
-- Note: You need to create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage section
-- 2. Click "New bucket"
-- 3. Name: "product-images"
-- 4. Make it public (or set up proper RLS policies)
-- 5. Save

-- ============================================
-- Storage Bucket RLS Policies
-- ============================================
-- These policies allow authenticated users to upload and read images
-- Note: First ensure RLS is enabled on storage.objects
-- Run: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to read images
CREATE POLICY "Authenticated users can read product images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update images
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- ============================================
