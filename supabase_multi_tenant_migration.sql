-- ============================================
-- POS Multi-Tenant Migration
-- ============================================
-- Run this in Supabase SQL Editor AFTER backing up your data.
-- This adds tenants, tenant_members, and tenant_id to all business tables.
-- ============================================

-- ============================================
-- 1. TABLES: tenants, tenant_members
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'starter',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_members (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- Helper: returns the set of tenant_ids the current user belongs to (must exist after tenant_members)
CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
$$;

-- ============================================
-- 2. DEFAULT TENANT (for existing data)
-- ============================================
INSERT INTO tenants (id, name, slug, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Mi Negocio',
  'default',
  'starter'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. ADD tenant_id TO BUSINESS TABLES
-- ============================================

-- Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE products SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

-- Sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
-- Optional: if your app uses discount, status, updated_at on sales (e.g. pending sales)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE sales SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE sales ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON sales(tenant_id);

-- Quotations (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotations') THEN
    ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE quotations SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    ALTER TABLE quotations ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_quotations_tenant_id ON quotations(tenant_id);
  END IF;
END $$;

-- ============================================
-- 4. UNIQUE CONSTRAINTS (per tenant)
-- ============================================

-- products: code unique per tenant
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_tenant_code ON products(tenant_id, code);

-- customers: phone unique per tenant (optional; allow null phone)
DROP INDEX IF EXISTS idx_customers_phone;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone) WHERE phone IS NOT NULL;

-- sales: sale_number unique per tenant
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sale_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_tenant_sale_number ON sales(tenant_id, sale_number);

-- quotations: quotation_code unique per tenant
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotations') THEN
    ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_quotation_code_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_tenant_code ON quotations(tenant_id, quotation_code);
  END IF;
END $$;

-- ============================================
-- 5. RLS: tenants & tenant_members
-- ============================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read tenants they belong to" ON tenants;
CREATE POLICY "Users can read tenants they belong to"
  ON tenants FOR SELECT
  USING (id IN (SELECT public.user_tenant_ids()));

DROP POLICY IF EXISTS "Users can update own tenant settings" ON tenants;
CREATE POLICY "Users can update own tenant settings"
  ON tenants FOR UPDATE
  USING (id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (id IN (SELECT public.user_tenant_ids()));

-- tenant_members: users see only their own rows
DROP POLICY IF EXISTS "Users can read own tenant_members" ON tenant_members;
CREATE POLICY "Users can read own tenant_members"
  ON tenant_members FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage tenant_members" ON tenant_members;
CREATE POLICY "Service role can manage tenant_members"
  ON tenant_members FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 6. RLS: products (tenant-scoped)
-- ============================================
DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON products;
DROP POLICY IF EXISTS "Products are insertable by authenticated users" ON products;
DROP POLICY IF EXISTS "Products are updatable by authenticated users" ON products;
DROP POLICY IF EXISTS "Products are deletable by authenticated users" ON products;

CREATE POLICY "Products tenant select"
  ON products FOR SELECT
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "Products tenant insert"
  ON products FOR INSERT
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "Products tenant update"
  ON products FOR UPDATE
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "Products tenant delete"
  ON products FOR DELETE
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- ============================================
-- 7. RLS: customers (tenant-scoped)
-- ============================================
DROP POLICY IF EXISTS "Customers are viewable by authenticated users" ON customers;
DROP POLICY IF EXISTS "Customers are insertable by authenticated users" ON customers;
DROP POLICY IF EXISTS "Customers are updatable by authenticated users" ON customers;
DROP POLICY IF EXISTS "Customers are deletable by authenticated users" ON customers;

CREATE POLICY "Customers tenant select"
  ON customers FOR SELECT
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "Customers tenant insert"
  ON customers FOR INSERT
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "Customers tenant update"
  ON customers FOR UPDATE
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "Customers tenant delete"
  ON customers FOR DELETE
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

-- ============================================
-- 8. RLS: sales (tenant-scoped)
-- ============================================
DROP POLICY IF EXISTS "Sales are viewable by authenticated users" ON sales;
DROP POLICY IF EXISTS "Sales are insertable by authenticated users" ON sales;
DROP POLICY IF EXISTS "Sales are updatable by authenticated users" ON sales;

CREATE POLICY "Sales tenant select"
  ON sales FOR SELECT
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "Sales tenant insert"
  ON sales FOR INSERT
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "Sales tenant update"
  ON sales FOR UPDATE
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- ============================================
-- 9. RLS: sale_items (via sale tenant)
-- ============================================
DROP POLICY IF EXISTS "Sale items are viewable by authenticated users" ON sale_items;
DROP POLICY IF EXISTS "Sale items are insertable by authenticated users" ON sale_items;
DROP POLICY IF EXISTS "Sale items are updatable by authenticated users" ON sale_items;
DROP POLICY IF EXISTS "Sale items are deletable by authenticated users" ON sale_items;

CREATE POLICY "Sale items select via sale"
  ON sale_items FOR SELECT
  USING (
    sale_id IN (SELECT id FROM sales WHERE tenant_id IN (SELECT public.user_tenant_ids()))
  );

CREATE POLICY "Sale items insert via sale"
  ON sale_items FOR INSERT
  WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE tenant_id IN (SELECT public.user_tenant_ids()))
  );

CREATE POLICY "Sale items update via sale"
  ON sale_items FOR UPDATE
  USING (
    sale_id IN (SELECT id FROM sales WHERE tenant_id IN (SELECT public.user_tenant_ids()))
  )
  WITH CHECK (
    sale_id IN (SELECT id FROM sales WHERE tenant_id IN (SELECT public.user_tenant_ids()))
  );

CREATE POLICY "Sale items delete via sale"
  ON sale_items FOR DELETE
  USING (
    sale_id IN (SELECT id FROM sales WHERE tenant_id IN (SELECT public.user_tenant_ids()))
  );

-- ============================================
-- 10. RLS: quotations (tenant-scoped)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotations') THEN
    DROP POLICY IF EXISTS "Users can read own quotations" ON quotations;
    DROP POLICY IF EXISTS "Authenticated users can create quotations" ON quotations;
    DROP POLICY IF EXISTS "Users can update own quotations" ON quotations;

    CREATE POLICY "Quotations tenant select"
      ON quotations FOR SELECT
      USING (tenant_id IN (SELECT public.user_tenant_ids()));

    CREATE POLICY "Quotations tenant insert"
      ON quotations FOR INSERT
      WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

    CREATE POLICY "Quotations tenant update"
      ON quotations FOR UPDATE
      USING (tenant_id IN (SELECT public.user_tenant_ids()))
      WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));
  END IF;
END $$;

-- ============================================
-- 11. RPC: Create tenant and join (for signup)
-- ============================================
-- Call from app after signUp: supabase.rpc('create_tenant_and_join', { p_name: 'Mi Negocio', p_slug: 'mi-negocio' })
CREATE OR REPLACE FUNCTION public.create_tenant_and_join(p_name TEXT, p_slug TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_slug TEXT := COALESCE(NULLIF(TRIM(p_slug), ''), lower(regexp_replace(trim(p_name), '\s+', '-', 'g')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  INSERT INTO tenants (name, slug)
  VALUES (p_name, v_slug)
  RETURNING id INTO v_tenant_id;
  INSERT INTO tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant_id, auth.uid(), 'owner');
  RETURN v_tenant_id;
END;
$$;

-- ============================================
-- 12. LINK EXISTING USERS TO DEFAULT TENANT
-- ============================================
-- Run this once so current auth users can still access data.
-- New signups should use the app flow that creates tenant + member.
INSERT INTO tenant_members (tenant_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, 'owner'
FROM auth.users
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- ============================================
-- END OF MIGRATION
-- ============================================
-- Next: In the app, pass tenant_id on every insert and use
-- currentTenantId from tenantStore (loaded after login).
