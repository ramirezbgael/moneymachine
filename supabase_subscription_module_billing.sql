-- ============================================
-- Subscription Module Billing (Multi-tenant)
-- ============================================
-- Purpose:
-- 1) Turn ON/OFF premium modules per tenant (subscriptions module).
-- 2) Persist subscription customers in Supabase.
-- 3) Register subscription renewals as sales for reports.
--
-- Run in Supabase SQL editor.
-- ============================================

-- --------------------------------------------
-- 1) Premium modules per tenant
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_module_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive', -- inactive | trial | active | past_due | cancelled
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, module_key),
  CONSTRAINT chk_module_key_subscriptions CHECK (module_key IN ('subscriptions')),
  CONSTRAINT chk_module_status CHECK (status IN ('inactive', 'trial', 'active', 'past_due', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_tenant_module_subscriptions_tenant
  ON tenant_module_subscriptions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_module_subscriptions_lookup
  ON tenant_module_subscriptions (tenant_id, module_key, status);

-- --------------------------------------------
-- 2) Subscription customers per tenant
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | cancelled
  notes TEXT,
  months_purchased INTEGER NOT NULL DEFAULT 1,
  total_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_payment_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_subscription_customer_status CHECK (status IN ('active', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_subscription_customers_tenant
  ON subscription_customers (tenant_id);

CREATE INDEX IF NOT EXISTS idx_subscription_customers_tenant_status
  ON subscription_customers (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_subscription_customers_end_date
  ON subscription_customers (tenant_id, end_date);

-- --------------------------------------------
-- 3) updated_at trigger helper reuse
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column_generic()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_module_subscriptions_updated_at ON tenant_module_subscriptions;
CREATE TRIGGER trg_tenant_module_subscriptions_updated_at
  BEFORE UPDATE ON tenant_module_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_generic();

DROP TRIGGER IF EXISTS trg_subscription_customers_updated_at ON subscription_customers;
CREATE TRIGGER trg_subscription_customers_updated_at
  BEFORE UPDATE ON subscription_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column_generic();

-- --------------------------------------------
-- 4) RLS
-- --------------------------------------------
ALTER TABLE tenant_module_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_customers ENABLE ROW LEVEL SECURITY;

-- tenant_module_subscriptions: tenant users can read own tenant module status
DROP POLICY IF EXISTS "Tenant members can read module subscriptions" ON tenant_module_subscriptions;
CREATE POLICY "Tenant members can read module subscriptions"
  ON tenant_module_subscriptions FOR SELECT
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- writes by service-role and tenant owner/admin (in-app admin panel)
DROP POLICY IF EXISTS "Service role can manage module subscriptions" ON tenant_module_subscriptions;
CREATE POLICY "Service role can manage module subscriptions"
  ON tenant_module_subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant owner admin can manage module subscriptions" ON tenant_module_subscriptions;
CREATE POLICY "Tenant owner admin can manage module subscriptions"
  ON tenant_module_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = tenant_module_subscriptions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tenant_members tm
      WHERE tm.tenant_id = tenant_module_subscriptions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
    )
  );

-- subscription_customers tenant-scoped CRUD
DROP POLICY IF EXISTS "Subscription customers tenant select" ON subscription_customers;
CREATE POLICY "Subscription customers tenant select"
  ON subscription_customers FOR SELECT
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

DROP POLICY IF EXISTS "Subscription customers tenant insert" ON subscription_customers;
CREATE POLICY "Subscription customers tenant insert"
  ON subscription_customers FOR INSERT
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

DROP POLICY IF EXISTS "Subscription customers tenant update" ON subscription_customers;
CREATE POLICY "Subscription customers tenant update"
  ON subscription_customers FOR UPDATE
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

DROP POLICY IF EXISTS "Subscription customers tenant delete" ON subscription_customers;
CREATE POLICY "Subscription customers tenant delete"
  ON subscription_customers FOR DELETE
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- --------------------------------------------
-- 5) Helper function for entitlement checks
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.is_module_enabled(p_tenant_id UUID, p_module_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_module_subscriptions tms
    WHERE tms.tenant_id = p_tenant_id
      AND tms.module_key = p_module_key
      AND tms.status IN ('active', 'trial')
      AND (tms.starts_at IS NULL OR tms.starts_at <= NOW())
      AND (tms.ends_at IS NULL OR tms.ends_at >= NOW())
  );
$$;

-- --------------------------------------------
-- 6) Optional bootstrap examples
-- --------------------------------------------
-- Example: enable subscriptions module for default tenant for 30 days trial
-- INSERT INTO tenant_module_subscriptions (tenant_id, module_key, status, monthly_price, starts_at, ends_at, auto_renew)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'subscriptions',
--   'trial',
--   99.00,
--   NOW(),
--   NOW() + INTERVAL '30 days',
--   FALSE
-- )
-- ON CONFLICT (tenant_id, module_key)
-- DO UPDATE SET
--   status = EXCLUDED.status,
--   monthly_price = EXCLUDED.monthly_price,
--   starts_at = EXCLUDED.starts_at,
--   ends_at = EXCLUDED.ends_at,
--   auto_renew = EXCLUDED.auto_renew,
--   updated_at = NOW();
