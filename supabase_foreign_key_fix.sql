-- ============================================
-- Fix Foreign Key Constraint for sale_items
-- ============================================
-- This script updates the foreign key constraint to allow
-- deleting products while preserving sale history
-- ============================================

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE sale_items
DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey;

-- Step 2: Make product_id nullable (to preserve sale history when product is deleted)
ALTER TABLE sale_items
ALTER COLUMN product_id DROP NOT NULL;

-- Step 3: Recreate the foreign key with ON DELETE SET NULL
-- This preserves sale history even if the product is deleted
ALTER TABLE sale_items
ADD CONSTRAINT sale_items_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE SET NULL;

-- ============================================
-- Verification
-- ============================================
-- Run this to verify the constraint was updated:
-- SELECT 
--   tc.constraint_name, 
--   tc.table_name, 
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON rc.constraint_name = tc.constraint_name
-- WHERE tc.table_name = 'sale_items' 
--   AND tc.constraint_type = 'FOREIGN KEY'
--   AND kcu.column_name = 'product_id';
--
-- Expected result: delete_rule should be 'SET NULL'
