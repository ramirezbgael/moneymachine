-- Supabase Storage Setup for Product Images
-- Run this SQL in your Supabase SQL Editor

-- 1. Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage policies for public read access
-- Allow anyone to read product images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated'
);

-- 3. Add image column to products table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN image_url TEXT;
    
    COMMENT ON COLUMN products.image_url IS 'URL of product image stored in Supabase Storage';
  END IF;
END $$;

-- 4. Optional: Add image_url index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_image_url 
ON products(image_url) 
WHERE image_url IS NOT NULL;

-- Verification queries:
-- Check bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'product-images';

-- Check policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%product-images%';

-- Check column:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url';
