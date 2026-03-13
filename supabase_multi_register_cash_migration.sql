-- Multi-register cash system migration for MoneyMachine
-- Safe to run multiple times.
-- Note: organization_id maps to tenant_id in current app architecture.

-- 1) Registers catalog
CREATE TABLE IF NOT EXISTS registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registers_org ON registers(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_registers_org_name ON registers(organization_id, name);

-- 2) Cash sessions (create if missing)
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  tenant_id UUID,
  register_id UUID REFERENCES registers(id),
  opened_by UUID,
  closed_by UUID,
  opened_by_user_id UUID,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_expected NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_counted NUMERIC(12,2),
  difference NUMERIC(12,2),
  closing_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.1) Backward-compatible alterations on existing cash_sessions
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES registers(id);
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS opened_by UUID;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS closed_by UUID;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS total_sales NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS cash_expected NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS cash_counted NUMERIC(12,2);
ALTER TABLE cash_sessions ADD COLUMN IF NOT EXISTS difference NUMERIC(12,2);

-- Keep compatibility with previous schema: mirror tenant_id -> organization_id when needed
UPDATE cash_sessions
SET organization_id = tenant_id
WHERE organization_id IS NULL AND tenant_id IS NOT NULL;

-- 2.2) Enforce one open session per register
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_sessions_one_open_per_register
  ON cash_sessions(register_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_cash_sessions_org_status
  ON cash_sessions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_register_status
  ON cash_sessions(register_id, status);

-- 3) Cash movements (create if missing)
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  tenant_id UUID,
  register_id UUID REFERENCES registers(id),
  session_id UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID
);

ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES registers(id);

UPDATE cash_movements cm
SET organization_id = cs.organization_id
FROM cash_sessions cs
WHERE cm.organization_id IS NULL AND cm.session_id = cs.id;

-- Extend movement types for POS-style operations while preserving legacy "adjustment"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cash_movements_type_check'
  ) THEN
    ALTER TABLE cash_movements DROP CONSTRAINT cash_movements_type_check;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE cash_movements
  ADD CONSTRAINT cash_movements_type_check
  CHECK (type IN ('sale', 'expense', 'withdrawal', 'manual_income', 'adjustment'));

CREATE INDEX IF NOT EXISTS idx_cash_movements_session_created
  ON cash_movements(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_movements_register_created
  ON cash_movements(register_id, created_at DESC);

-- 4) Sales integration
ALTER TABLE sales ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES registers(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES cash_sessions(id);

CREATE INDEX IF NOT EXISTS idx_sales_register_created
  ON sales(register_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_session_created
  ON sales(session_id, created_at DESC);

-- 5) RLS (baseline)
ALTER TABLE registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_registers_all ON registers;
CREATE POLICY p_registers_all ON registers
FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_cash_sessions_all ON cash_sessions;
CREATE POLICY p_cash_sessions_all ON cash_sessions
FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_cash_movements_all ON cash_movements;
CREATE POLICY p_cash_movements_all ON cash_movements
FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- 6) Helper: seed default register per organization (run manually if needed)
-- INSERT INTO registers (organization_id, name, location)
-- SELECT DISTINCT COALESCE(organization_id, tenant_id), 'Caja principal', 'Mostrador'
-- FROM cash_sessions
-- WHERE COALESCE(organization_id, tenant_id) IS NOT NULL
-- ON CONFLICT DO NOTHING;
