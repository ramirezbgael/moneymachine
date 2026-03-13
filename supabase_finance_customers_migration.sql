-- ============================================================
-- Finance customers + receivables relationship migration
-- MoneyMachine - Finanzas > Cuentas por cobrar
-- Safe to run multiple times.
-- ============================================================

-- 1) New finance customers table
CREATE TABLE IF NOT EXISTS finance_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_customers_tenant
  ON finance_customers(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_customers_tenant_name
  ON finance_customers(tenant_id, name);

-- 2) Extend accounts_receivable with relational fields
ALTER TABLE accounts_receivable
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Keep old text field for backward compatibility and quick display
ALTER TABLE accounts_receivable
  ALTER COLUMN client_name DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_accounts_receivable_client_id'
  ) THEN
    ALTER TABLE accounts_receivable
      ADD CONSTRAINT fk_accounts_receivable_client_id
      FOREIGN KEY (client_id)
      REFERENCES finance_customers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_tenant_client
  ON accounts_receivable(tenant_id, client_id, status);

-- 3) Trigger for updated_at in finance_customers
CREATE OR REPLACE FUNCTION fn_set_finance_customers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_customers_updated_at ON finance_customers;
CREATE TRIGGER trg_finance_customers_updated_at
BEFORE UPDATE ON finance_customers
FOR EACH ROW
EXECUTE FUNCTION fn_set_finance_customers_updated_at();

-- 4) RLS policies (same openness as current finance schema)
ALTER TABLE finance_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_finance_customers_all ON finance_customers;
CREATE POLICY p_finance_customers_all ON finance_customers
FOR ALL USING (TRUE) WITH CHECK (TRUE);
