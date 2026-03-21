-- =============================================================================
-- MoneyMachine — Production multi-tenant SaaS refactor (MONOLÍTICO)
-- =============================================================================
-- ⚠️  Para producción con datos reales, usa las 6 fases + 00/08 en:
--     supabase/migrations/safe/README.md
--     (sin business_id “inventado”, validación en fase 4, RLS solo en fase 6).
--
-- Este archivo se mantiene como referencia / “todo en uno” avanzado.
-- Run in Supabase SQL Editor on a STAGING clone first, then production.
--
-- What this does:
--   • Renames tenant model → businesses + memberships (+ business_id)
--   • Renames subscription_customers → client_memberships (gym/client subs)
--   • Renames tenant_module_subscriptions → saas_module_entitlements (MoneyMachine)
--   • Adds saas_subscriptions (Stripe-ready SaaS billing per business)
--   • Adds profiles + auth trigger
--   • Consolidates cash/register tenant_id + organization_id → business_id
--   • Replaces permissive finance RLS with business-scoped policies
--   • Adds sale_items.business_id (denormalized for RLS + indexes)
--
-- After this migration, use RPC: create_business_and_membership
--   (create_tenant_and_join remains as a thin alias for backwards compatibility).
--
-- PREREQUISITE: You already ran the multi-tenant migration (public.tenants exists)
--   or you already have public.businesses. This script is not for a bare POS schema
--   without any tenant/business row.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) CORE: tenants → businesses, tenant_members → memberships
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenants'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'businesses'
  ) THEN
    ALTER TABLE public.tenants RENAME TO businesses;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_members'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'memberships'
  ) THEN
    ALTER TABLE public.tenant_members RENAME TO memberships;
  END IF;
END $$;

-- memberships.business_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.memberships RENAME COLUMN tenant_id TO business_id;
  END IF;
END $$;

-- Drop old unique constraint name if present (PostgreSQL renames internally sometimes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_members_tenant_id_user_id_key'
  ) THEN
    ALTER TABLE public.memberships RENAME CONSTRAINT tenant_members_tenant_id_user_id_key TO memberships_business_id_user_id_key;
  END IF;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2) SaaS billing table (Stripe-ready) — separate from client_memberships
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saas_subscriptions_status_check CHECK (
    status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')
  )
);

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_business ON public.saas_subscriptions (business_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_status ON public.saas_subscriptions (status);

-- -----------------------------------------------------------------------------
-- 3) businesses: trial + SaaS billing fields
-- -----------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_billing_status_check'
  ) THEN
    ALTER TABLE public.businesses
      ADD CONSTRAINT businesses_billing_status_check CHECK (
        billing_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')
      );
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_stripe_customer_unique
  ON public.businesses (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Backfill trial for existing businesses (one-time; adjust if you already bill differently)
UPDATE public.businesses
SET
  trial_ends_at = COALESCE(trial_ends_at, created_at + INTERVAL '7 days'),
  billing_status = CASE
    WHEN billing_status IS DISTINCT FROM 'canceled' AND billing_status IS DISTINCT FROM 'past_due'
    THEN COALESCE(NULLIF(billing_status, ''), 'trialing')
    ELSE billing_status
  END
WHERE trial_ends_at IS NULL;

-- -----------------------------------------------------------------------------
-- 4) profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  default_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_default_business ON public.profiles (default_business_id);

INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_saas_subscriptions_updated_at ON public.saas_subscriptions;
CREATE TRIGGER trg_saas_subscriptions_updated_at
  BEFORE UPDATE ON public.saas_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 5) Rename tenant_id → business_id on operational tables
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'products',
    'customers',
    'sales',
    'quotations',
    'finance_customers',
    'accounts_receivable',
    'payments'
  ]) AS tbl
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = r.tbl AND c.column_name = 'tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN tenant_id TO business_id', r.tbl);
    END IF;
  END LOOP;
END $$;

-- Registers: organization_id → business_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'registers' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.registers RENAME COLUMN organization_id TO business_id;
  END IF;
END $$;

-- Cash: single business_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_sessions' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.cash_sessions ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.cash_sessions cs
SET business_id = COALESCE(cs.business_id, cs.tenant_id, cs.organization_id)
WHERE cs.business_id IS NULL;

-- NO asignar business_id al “primer negocio” en silencio (riesgo de mezclar datos).
-- Si quedan NULL, corregir manualmente o usar supabase/migrations/safe/ antes de NOT NULL.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_sessions'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.cash_sessions DROP COLUMN tenant_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_sessions'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.cash_sessions DROP COLUMN organization_id;
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT COUNT(*)::int INTO n FROM public.cash_sessions WHERE business_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'cash_sessions: % filas sin business_id — corregir antes de NOT NULL (ver migración safe/)', n;
  END IF;
  ALTER TABLE public.cash_sessions ALTER COLUMN business_id SET NOT NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_movements' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.cash_movements ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE public.cash_movements cm
SET business_id = COALESCE(cm.business_id, cm.tenant_id, cm.organization_id,
  (SELECT cs.business_id FROM public.cash_sessions cs WHERE cs.id = cm.session_id))
WHERE cm.business_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_movements' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.cash_movements DROP COLUMN tenant_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_movements' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.cash_movements DROP COLUMN organization_id;
  END IF;
END $$;

DO $$
DECLARE n int;
BEGIN
  SELECT COUNT(*)::int INTO n FROM public.cash_movements WHERE business_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'cash_movements: % filas sin business_id — corregir antes de NOT NULL', n;
  END IF;
  ALTER TABLE public.cash_movements ALTER COLUMN business_id SET NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_cash_sessions_business_status ON public.cash_sessions (business_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_movements_business ON public.cash_movements (business_id);

-- -----------------------------------------------------------------------------
-- 6) Rename confusing subscription tables
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_module_subscriptions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'saas_module_entitlements'
  ) THEN
    ALTER TABLE public.tenant_module_subscriptions RENAME TO saas_module_entitlements;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saas_module_entitlements' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.saas_module_entitlements RENAME COLUMN tenant_id TO business_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscription_customers'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'client_memberships'
  ) THEN
    ALTER TABLE public.subscription_customers RENAME TO client_memberships;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_memberships' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.client_memberships RENAME COLUMN tenant_id TO business_id;
  END IF;
END $$;

-- Greenfield: create SaaS entitlement + client membership tables if missing
CREATE TABLE IF NOT EXISTS public.saas_module_entitlements (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MXN',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, module_key),
  CONSTRAINT chk_saas_module_key CHECK (module_key IN ('subscriptions')),
  CONSTRAINT chk_saas_module_status CHECK (status IN ('inactive', 'trial', 'active', 'past_due', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.client_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  months_purchased INTEGER NOT NULL DEFAULT 1,
  total_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_payment_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_client_membership_status CHECK (status IN ('active', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_saas_module_entitlements_business ON public.saas_module_entitlements (business_id);
CREATE INDEX IF NOT EXISTS idx_saas_module_entitlements_lookup ON public.saas_module_entitlements (business_id, module_key, status);
CREATE INDEX IF NOT EXISTS idx_client_memberships_business ON public.client_memberships (business_id);
CREATE INDEX IF NOT EXISTS idx_client_memberships_business_status ON public.client_memberships (business_id, status);
CREATE INDEX IF NOT EXISTS idx_client_memberships_end_date ON public.client_memberships (business_id, end_date);

-- -----------------------------------------------------------------------------
-- 7) sale_items.business_id (denormalized)
-- -----------------------------------------------------------------------------
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.sale_items si
SET business_id = s.business_id
FROM public.sales s
WHERE si.sale_id = s.id AND si.business_id IS NULL;

ALTER TABLE public.sale_items ALTER COLUMN business_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sale_items_business ON public.sale_items (business_id);

CREATE OR REPLACE FUNCTION public.sync_sale_item_business_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  bid UUID;
BEGIN
  SELECT business_id INTO bid FROM public.sales WHERE id = NEW.sale_id;
  IF bid IS NULL THEN
    RAISE EXCEPTION 'sale % has no business_id', NEW.sale_id;
  END IF;
  NEW.business_id := bid;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sale_items_set_business ON public.sale_items;
CREATE TRIGGER trg_sale_items_set_business
  BEFORE INSERT OR UPDATE OF sale_id ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_sale_item_business_id();

-- -----------------------------------------------------------------------------
-- 8) Unique indexes per business (replace tenant-prefixed names)
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_products_tenant_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_business_code ON public.products (business_id, code);

DROP INDEX IF EXISTS public.idx_customers_tenant_phone;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_business_phone ON public.customers (business_id, phone) WHERE phone IS NOT NULL;

DROP INDEX IF EXISTS public.idx_sales_tenant_sale_number;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_business_sale_number ON public.sales (business_id, sale_number);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotations') THEN
    DROP INDEX IF EXISTS public.idx_quotations_tenant_code;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_business_code ON public.quotations (business_id, quotation_code);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.registers') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_registers_business_name ON public.registers (business_id, name);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 9) Finance triggers: use business_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_register_cash_movement_from_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_session_id UUID;
  v_client_name TEXT;
BEGIN
  IF LOWER(NEW.payment_method) <> 'cash' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_session_id
  FROM public.cash_sessions
  WHERE business_id = NEW.business_id AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT client_name INTO v_client_name
  FROM public.accounts_receivable
  WHERE id = NEW.receivable_id;

  INSERT INTO public.cash_movements (
    business_id, session_id, type, description, amount, created_at, user_id
  ) VALUES (
    NEW.business_id,
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

-- -----------------------------------------------------------------------------
-- 10) Helper functions for RLS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_business_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.memberships WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.user_business_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_business_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_business_role(p_business_id UUID, VARIADIC p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.business_id = p_business_id
      AND m.user_id = auth.uid()
      AND m.role = ANY (p_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_business_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_business_role(UUID, TEXT[]) TO authenticated;

-- Optional: keep old name as alias (remove in a later cleanup if desired)
CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT * FROM public.user_business_ids(); $$;

REVOKE ALL ON FUNCTION public.user_tenant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_tenant_ids() TO authenticated;

-- -----------------------------------------------------------------------------
-- 11) RPC: create business + owner membership (+ trial)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_business_and_membership(p_name TEXT, p_slug TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_slug TEXT := COALESCE(NULLIF(TRIM(p_slug), ''), lower(regexp_replace(trim(p_name), '\s+', '-', 'g')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  INSERT INTO public.businesses (name, slug, plan, trial_ends_at, billing_status)
  VALUES (p_name, v_slug, 'trial', NOW() + INTERVAL '7 days', 'trialing')
  RETURNING id INTO v_business_id;

  INSERT INTO public.memberships (business_id, user_id, role)
  VALUES (v_business_id, auth.uid(), 'owner');

  UPDATE public.profiles SET default_business_id = v_business_id WHERE id = auth.uid();

  RETURN v_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_business_and_membership(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business_and_membership(TEXT, TEXT) TO authenticated;

-- Backward-compatible RPC name (calls new implementation)
CREATE OR REPLACE FUNCTION public.create_tenant_and_join(p_name TEXT, p_slug TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.create_business_and_membership(p_name, p_slug); $$;

REVOKE ALL ON FUNCTION public.create_tenant_and_join(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_and_join(TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 12) is_module_enabled → saas_module_entitlements
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.is_module_enabled(uuid, text);

CREATE OR REPLACE FUNCTION public.is_module_enabled(p_business_id UUID, p_module_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.saas_module_entitlements tms
    WHERE tms.business_id = p_business_id
      AND tms.module_key = p_module_key
      AND tms.status IN ('active', 'trial')
      AND (tms.starts_at IS NULL OR tms.starts_at <= NOW())
      AND (tms.ends_at IS NULL OR tms.ends_at >= NOW())
  );
$$;

REVOKE ALL ON FUNCTION public.is_module_enabled(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_module_enabled(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 13) DROP ALL POLICIES (selected tables) — then recreate
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'businesses','memberships','profiles','products','customers','sales','sale_items',
        'quotations','saas_module_entitlements','client_memberships','saas_subscriptions',
        'registers','cash_sessions','cash_movements','accounts_receivable','payments',
        'finance_customers'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ---------- profiles ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---------- businesses ----------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY businesses_select_member ON public.businesses
  FOR SELECT USING (id IN (SELECT public.user_business_ids()));

CREATE POLICY businesses_update_privileged ON public.businesses
  FOR UPDATE
  USING (public.has_business_role(id, 'owner', 'admin', 'billing'))
  WITH CHECK (public.has_business_role(id, 'owner', 'admin', 'billing'));

-- ---------- memberships ----------
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY memberships_select_same_business ON public.memberships
  FOR SELECT USING (business_id IN (SELECT public.user_business_ids()));

CREATE POLICY memberships_insert_admin ON public.memberships
  FOR INSERT WITH CHECK (public.has_business_role(business_id, 'owner', 'admin'));

CREATE POLICY memberships_update_admin ON public.memberships
  FOR UPDATE
  USING (public.has_business_role(business_id, 'owner', 'admin'))
  WITH CHECK (public.has_business_role(business_id, 'owner', 'admin'));

CREATE POLICY memberships_delete_admin ON public.memberships
  FOR DELETE USING (public.has_business_role(business_id, 'owner', 'admin'));

CREATE POLICY memberships_service_all ON public.memberships
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------- operational tables ----------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_all ON public.products FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_all ON public.customers FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_all ON public.sales FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY sale_items_all ON public.sale_items FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotations') THEN
    ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS quotations_all ON public.quotations';
    EXECUTE 'CREATE POLICY quotations_all ON public.quotations FOR ALL
      USING (business_id IN (SELECT public.user_business_ids()))
      WITH CHECK (business_id IN (SELECT public.user_business_ids()))';
  END IF;
END $$;

-- ---------- SaaS entitlements & Stripe mirror ----------
DO $$
BEGIN
  IF to_regclass('public.saas_module_entitlements') IS NOT NULL THEN
    ALTER TABLE public.saas_module_entitlements ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS saas_modules_select_member ON public.saas_module_entitlements';
    EXECUTE 'DROP POLICY IF EXISTS saas_modules_manage_privileged ON public.saas_module_entitlements';
    EXECUTE 'DROP POLICY IF EXISTS saas_modules_service_all ON public.saas_module_entitlements';
    EXECUTE $p$
      CREATE POLICY saas_modules_select_member ON public.saas_module_entitlements
        FOR SELECT USING (business_id IN (SELECT public.user_business_ids()));
    $p$;
    EXECUTE $p$
      CREATE POLICY saas_modules_manage_privileged ON public.saas_module_entitlements
        FOR ALL
        USING (public.has_business_role(business_id, 'owner', 'admin'))
        WITH CHECK (public.has_business_role(business_id, 'owner', 'admin'));
    $p$;
    EXECUTE $p$
      CREATE POLICY saas_modules_service_all ON public.saas_module_entitlements
        FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    $p$;
  END IF;
END $$;

ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saas_subscriptions_select_billing ON public.saas_subscriptions;
DROP POLICY IF EXISTS saas_subscriptions_service_all ON public.saas_subscriptions;
CREATE POLICY saas_subscriptions_select_billing ON public.saas_subscriptions
  FOR SELECT USING (public.has_business_role(business_id, 'owner', 'admin', 'billing'));
CREATE POLICY saas_subscriptions_service_all ON public.saas_subscriptions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- client memberships (gym / end-customer subs) ----------
DO $$
BEGIN
  IF to_regclass('public.client_memberships') IS NOT NULL THEN
    ALTER TABLE public.client_memberships ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS client_memberships_business_all ON public.client_memberships';
    EXECUTE 'DROP POLICY IF EXISTS client_memberships_tenant_all ON public.client_memberships';
    EXECUTE 'DROP POLICY IF EXISTS client_memberships_anon_select ON public.client_memberships';
    EXECUTE 'DROP POLICY IF EXISTS "Public anon read by id" ON public.client_memberships';
    EXECUTE $p$
      CREATE POLICY client_memberships_business_all ON public.client_memberships FOR ALL
        USING (business_id IN (SELECT public.user_business_ids()))
        WITH CHECK (business_id IN (SELECT public.user_business_ids()));
    $p$;
    EXECUTE $p$
      CREATE POLICY client_memberships_anon_select ON public.client_memberships
        FOR SELECT TO anon USING (true);
    $p$;
  END IF;
END $$;

-- ---------- Finance & registers ----------
DO $$
BEGIN
  IF to_regclass('public.registers') IS NOT NULL THEN
    ALTER TABLE public.registers ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS registers_all ON public.registers';
    EXECUTE 'DROP POLICY IF EXISTS p_registers_all ON public.registers';
    EXECUTE $p$
      CREATE POLICY registers_all ON public.registers FOR ALL
        USING (business_id IN (SELECT public.user_business_ids()))
        WITH CHECK (business_id IN (SELECT public.user_business_ids()));
    $p$;
  END IF;

  IF to_regclass('public.cash_sessions') IS NOT NULL THEN
    ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS cash_sessions_all ON public.cash_sessions';
    EXECUTE 'DROP POLICY IF EXISTS p_cash_sessions_all ON public.cash_sessions';
    EXECUTE 'DROP POLICY IF EXISTS p_cash_sessions_select ON public.cash_sessions';
    EXECUTE 'DROP POLICY IF EXISTS p_cash_sessions_insert ON public.cash_sessions';
    EXECUTE 'DROP POLICY IF EXISTS p_cash_sessions_update ON public.cash_sessions';
    EXECUTE $p$
      CREATE POLICY cash_sessions_all ON public.cash_sessions FOR ALL
        USING (business_id IN (SELECT public.user_business_ids()))
        WITH CHECK (business_id IN (SELECT public.user_business_ids()));
    $p$;
  END IF;

  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS cash_movements_all ON public.cash_movements';
    EXECUTE 'DROP POLICY IF EXISTS p_cash_movements_all ON public.cash_movements';
    EXECUTE $p$
      CREATE POLICY cash_movements_all ON public.cash_movements FOR ALL
        USING (business_id IN (SELECT public.user_business_ids()))
        WITH CHECK (business_id IN (SELECT public.user_business_ids()));
    $p$;
  END IF;

  IF to_regclass('public.finance_customers') IS NOT NULL THEN
    ALTER TABLE public.finance_customers ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS finance_customers_all ON public.finance_customers';
    EXECUTE 'DROP POLICY IF EXISTS p_finance_customers_all ON public.finance_customers';
    EXECUTE $p$
      CREATE POLICY finance_customers_all ON public.finance_customers FOR ALL
        USING (business_id IN (SELECT public.user_business_ids()))
        WITH CHECK (business_id IN (SELECT public.user_business_ids()));
    $p$;
  END IF;

  IF to_regclass('public.accounts_receivable') IS NOT NULL THEN
    ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS accounts_receivable_all ON public.accounts_receivable';
    EXECUTE 'DROP POLICY IF EXISTS p_accounts_receivable_all ON public.accounts_receivable';
    EXECUTE $p$
      CREATE POLICY accounts_receivable_all ON public.accounts_receivable FOR ALL
        USING (business_id IN (SELECT public.user_business_ids()))
        WITH CHECK (business_id IN (SELECT public.user_business_ids()));
    $p$;
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS payments_all ON public.payments';
    EXECUTE 'DROP POLICY IF EXISTS p_payments_all ON public.payments';
    EXECUTE $p$
      CREATE POLICY payments_all ON public.payments FOR ALL
        USING (business_id IN (SELECT public.user_business_ids()))
        WITH CHECK (business_id IN (SELECT public.user_business_ids()));
    $p$;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 14) Reporting views (tenant_id → business_id)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.daily_sales_total CASCADE;

CREATE VIEW public.daily_sales_total AS
SELECT
  business_id,
  COALESCE(SUM(total), 0)::NUMERIC(12,2) AS total
FROM public.sales
WHERE status = 'completed'
  AND payment_method IN ('cash', 'card', 'transfer')
  AND created_at >= DATE_TRUNC('day', NOW())
GROUP BY business_id;

GRANT SELECT ON public.daily_sales_total TO authenticated;
