-- Migration script to add missing columns to quotations table
-- Run this if you already created the quotations table without the tax columns

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add subtotal_after_discount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' 
    AND column_name = 'subtotal_after_discount'
  ) THEN
    ALTER TABLE quotations ADD COLUMN subtotal_after_discount DECIMAL(10, 2) NOT NULL DEFAULT 0;
  END IF;

  -- Add tax_rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' 
    AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE quotations ADD COLUMN tax_rate DECIMAL(5, 2) DEFAULT 0;
  END IF;

  -- Add tax_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations' 
    AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE quotations ADD COLUMN tax_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;
END $$;

-- Update existing rows to set subtotal_after_discount = subtotal - discount
-- (if they don't have the value set)
UPDATE quotations 
SET subtotal_after_discount = GREATEST(0, subtotal - COALESCE(discount, 0))
WHERE subtotal_after_discount = 0 AND subtotal > 0;

-- Verification query
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'quotations' 
-- ORDER BY ordinal_position;
