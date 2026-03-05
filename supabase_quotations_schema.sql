-- Quotations Table Schema
-- Run this SQL in your Supabase SQL Editor

-- Create quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id BIGSERIAL PRIMARY KEY,
  quotation_code VARCHAR(50) UNIQUE NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  subtotal_after_discount DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on quotation_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_quotations_code ON quotations(quotation_code);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_user ON quotations(user_id);

-- Add comment
COMMENT ON TABLE quotations IS 'Stores quotations that can be converted to sales by scanning QR code';
COMMENT ON COLUMN quotations.quotation_code IS 'Unique code for quotation (format: QUOTE-YYYYMMDD-XXXX)';
COMMENT ON COLUMN quotations.items IS 'JSON array of quotation items with product info';
COMMENT ON COLUMN quotations.status IS 'Status: active (can be used), converted (already sold), expired';

-- RLS Policies
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can read own quotations" ON quotations;
DROP POLICY IF EXISTS "Authenticated users can create quotations" ON quotations;
DROP POLICY IF EXISTS "Users can update own quotations" ON quotations;

-- Policy: Users can read their own quotations
CREATE POLICY "Users can read own quotations"
  ON quotations FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Policy: Authenticated users can create quotations
CREATE POLICY "Authenticated users can create quotations"
  ON quotations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy: Users can update their own quotations
CREATE POLICY "Users can update own quotations"
  ON quotations FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- Verification queries:
-- SELECT * FROM quotations ORDER BY created_at DESC LIMIT 10;
-- SELECT quotation_code, total, status FROM quotations WHERE status = 'active';
