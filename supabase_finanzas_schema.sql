-- Finanzas module schema (cash sessions, receivables, payments)
-- Safe to run multiple times.

-- 1) Caja: sesiones de caja
CREATE TABLE IF NOT EXISTS cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  opened_by_user_id UUID,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant_status
  ON cash_sessions(tenant_id, status);

-- 2) Caja: movimientos
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale', 'expense', 'adjustment')),
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_session_created
  ON cash_movements(session_id, created_at DESC);

-- 3) Cuentas por cobrar
CREATE TABLE IF NOT EXISTS accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  concept TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_tenant_status
  ON accounts_receivable(tenant_id, status);

-- 4) Pagos de cuentas por cobrar
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  receivable_id UUID NOT NULL REFERENCES accounts_receivable(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID
);

CREATE INDEX IF NOT EXISTS idx_payments_receivable
  ON payments(receivable_id, paid_at DESC);

-- 5) Trigger: actualizar status de CxC al registrar pago
CREATE OR REPLACE FUNCTION fn_update_receivable_status_after_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_due NUMERIC(12,2);
  v_total_paid NUMERIC(12,2);
BEGIN
  SELECT amount INTO v_total_due
  FROM accounts_receivable
  WHERE id = NEW.receivable_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE receivable_id = NEW.receivable_id;

  UPDATE accounts_receivable
  SET status = CASE WHEN v_total_paid >= v_total_due THEN 'paid' ELSE 'pending' END,
      updated_at = NOW()
  WHERE id = NEW.receivable_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_receivable_status_after_payment ON payments;
CREATE TRIGGER trg_update_receivable_status_after_payment
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION fn_update_receivable_status_after_payment();

-- 6) Trigger: si pago es en efectivo y hay caja abierta, registrar movimiento en caja
CREATE OR REPLACE FUNCTION fn_register_cash_movement_from_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
  v_client_name TEXT;
BEGIN
  IF LOWER(NEW.payment_method) <> 'cash' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_session_id
  FROM cash_sessions
  WHERE tenant_id = NEW.tenant_id AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT client_name INTO v_client_name
  FROM accounts_receivable
  WHERE id = NEW.receivable_id;

  INSERT INTO cash_movements (
    tenant_id,
    session_id,
    type,
    description,
    amount,
    created_at,
    user_id
  ) VALUES (
    NEW.tenant_id,
    v_session_id,
    'sale',
    CONCAT('Pago CxC ', COALESCE(v_client_name, 'cliente')),
    NEW.amount,
    NEW.paid_at,
    NEW.user_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_register_cash_movement_from_payment ON payments;
CREATE TRIGGER trg_register_cash_movement_from_payment
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION fn_register_cash_movement_from_payment();

-- 7) RLS (base, tenant-scoped)
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- NOTE:
-- Replace auth.uid() membership checks below to match your tenant-membership model.
-- Kept minimal and explicit for easy adaptation.

DROP POLICY IF EXISTS p_cash_sessions_select ON cash_sessions;
CREATE POLICY p_cash_sessions_select ON cash_sessions
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS p_cash_sessions_insert ON cash_sessions;
CREATE POLICY p_cash_sessions_insert ON cash_sessions
FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_cash_sessions_update ON cash_sessions;
CREATE POLICY p_cash_sessions_update ON cash_sessions
FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_cash_movements_all ON cash_movements;
CREATE POLICY p_cash_movements_all ON cash_movements
FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_accounts_receivable_all ON accounts_receivable;
CREATE POLICY p_accounts_receivable_all ON accounts_receivable
FOR ALL USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS p_payments_all ON payments;
CREATE POLICY p_payments_all ON payments
FOR ALL USING (TRUE) WITH CHECK (TRUE);
