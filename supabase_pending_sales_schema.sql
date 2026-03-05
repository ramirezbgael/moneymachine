-- Pending Sales Feature - Database Schema Update
-- Run this SQL in your Supabase SQL Editor

-- 1. Add status column to sales table (if not exists)
-- The status column tracks the sale lifecycle: pending, completed, cancelled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'status'
  ) THEN
    ALTER TABLE sales 
    ADD COLUMN status VARCHAR(20) DEFAULT 'completed';
    
    -- Add check constraint
    ALTER TABLE sales
    ADD CONSTRAINT sales_status_check 
    CHECK (status IN ('pending', 'completed', 'cancelled'));
  END IF;
END $$;

-- 2. Make payment_method nullable for pending sales
-- Pending sales don't have a payment method yet
ALTER TABLE sales 
ALTER COLUMN payment_method DROP NOT NULL;

-- 3. Add index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_status 
ON sales(status);

-- 4. Add index on status + created_at for pending sales list
CREATE INDEX IF NOT EXISTS idx_sales_status_created_at 
ON sales(status, created_at DESC);

-- 5. Update existing sales to have 'completed' status if null
UPDATE sales 
SET status = 'completed' 
WHERE status IS NULL;

-- 6. Add comment to status column
COMMENT ON COLUMN sales.status IS 'Sale status: pending (not paid), completed (paid), cancelled (refunded/cancelled)';

-- 7. Optional: Create view for pending sales
CREATE OR REPLACE VIEW pending_sales AS
SELECT 
  s.*,
  COUNT(si.id) as item_count,
  json_agg(
    json_build_object(
      'id', si.id,
      'product_id', si.product_id,
      'quantity', si.quantity,
      'unit_price', si.unit_price,
      'subtotal', si.subtotal
    )
  ) as items
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE s.status = 'pending'
GROUP BY s.id
ORDER BY s.created_at DESC;

-- 8. Grant access to the view
GRANT SELECT ON pending_sales TO authenticated;

-- Verification queries:
-- Check if status column exists and has correct values
-- SELECT status, COUNT(*) FROM sales GROUP BY status;

-- View pending sales
-- SELECT * FROM pending_sales;
