-- ============================================
-- Update Products Table - Add Cost Field
-- ============================================
-- Run this SQL to add the cost (purchase price) field

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2) DEFAULT 0;

-- Update existing products: set cost to 60% of price if cost is 0
UPDATE products 
SET cost = price * 0.6 
WHERE cost = 0 OR cost IS NULL;

-- Add comment
COMMENT ON COLUMN products.cost IS 'Purchase cost of the product';
COMMENT ON COLUMN products.price IS 'Selling price of the product';

-- ========================================
-- Update Sales Table - Add Discount and Status
-- ========================================
-- Run this SQL to add discount column and pending sales support

-- 1. Add discount column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN sales.discount IS 'Discount amount applied to the sale';

-- 2. Add status column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';

-- Add check constraint for status
ALTER TABLE sales
DROP CONSTRAINT IF EXISTS sales_status_check;

ALTER TABLE sales
ADD CONSTRAINT sales_status_check 
CHECK (status IN ('pending', 'completed', 'cancelled'));

COMMENT ON COLUMN sales.status IS 'Sale status: pending (not paid), completed (paid), cancelled (refunded)';

-- 3. Make payment_method nullable (for pending sales)
ALTER TABLE sales 
ALTER COLUMN payment_method DROP NOT NULL;

-- 4. Update existing sales to have discount = 0 if null
UPDATE sales 
SET discount = 0 
WHERE discount IS NULL;

-- 5. Update existing sales to have status = 'completed' if null
UPDATE sales 
SET status = 'completed' 
WHERE status IS NULL;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_status_created_at ON sales(status, created_at DESC);

-- 7. Create view for pending sales (optional but recommended)
CREATE OR REPLACE VIEW pending_sales AS
SELECT 
  s.*,
  COUNT(si.id) as item_count
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE s.status = 'pending'
GROUP BY s.id
ORDER BY s.created_at DESC;

GRANT SELECT ON pending_sales TO authenticated;

-- ========================================
-- VERIFICATION QUERIES (optional - run after the above)
-- ========================================

-- Check sales table structure:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'sales' 
-- ORDER BY ordinal_position;

-- Check status distribution:
-- SELECT status, COUNT(*) FROM sales GROUP BY status;
