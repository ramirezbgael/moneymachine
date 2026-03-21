-- =============================================================================
-- PHASE 3 — Renombres + backfill desde datos conocidos (sin valores inventados)
-- =============================================================================
-- NO asigna business_id “al azar” ni al primer negocio.
-- Si tras esta fase quedan NULL en business_id en caja/movimientos, fase 4 debe
-- fallar y tú corriges manualmente o con un script explícito (UUID conocido).
-- =============================================================================

-- 3.1 Núcleo tenant → business
DO $$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL AND to_regclass('public.businesses') IS NULL THEN
    ALTER TABLE public.tenants RENAME TO businesses;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.tenant_members') IS NOT NULL AND to_regclass('public.memberships') IS NULL THEN
    ALTER TABLE public.tenant_members RENAME TO memberships;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.memberships') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'tenant_id'
    ) THEN
      ALTER TABLE public.memberships RENAME COLUMN tenant_id TO business_id;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_members_tenant_id_user_id_key') THEN
    ALTER TABLE public.memberships RENAME CONSTRAINT tenant_members_tenant_id_user_id_key TO memberships_business_id_user_id_key;
  END IF;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 3.2 Tablas operativas: renombrar tenant_id → business_id si no hay duplicado de columnas
DO $$
DECLARE
  r TEXT;
  tables TEXT[] := ARRAY[
    'products','customers','sales','quotations',
    'finance_customers','accounts_receivable','payments'
  ];
BEGIN
  FOREACH r IN ARRAY tables
  LOOP
    IF to_regclass('public.' || r) IS NULL THEN
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r AND column_name = 'tenant_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r AND column_name = 'business_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN tenant_id TO business_id', r);
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = r AND column_name = 'tenant_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = r AND column_name = 'business_id'
    ) THEN
      EXECUTE format('UPDATE public.%I SET business_id = COALESCE(business_id, tenant_id) WHERE business_id IS NULL AND tenant_id IS NOT NULL', r);
    END IF;
  END LOOP;
END $$;

-- 3.3 Registers
DO $$
BEGIN
  IF to_regclass('public.registers') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registers' AND column_name = 'organization_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registers' AND column_name = 'business_id')
  THEN
    ALTER TABLE public.registers RENAME COLUMN organization_id TO business_id;
  END IF;
END $$;

-- 3.4 Caja: copiar solo desde columnas presentes en tu esquema (nunca “primer negocio”)
DO $$
DECLARE
  cs_has_tenant BOOLEAN;
  cs_has_org BOOLEAN;
  cm_has_tenant BOOLEAN;
  cm_has_org BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_sessions' AND column_name = 'tenant_id') INTO cs_has_tenant;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_sessions' AND column_name = 'organization_id') INTO cs_has_org;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_movements' AND column_name = 'tenant_id') INTO cm_has_tenant;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_movements' AND column_name = 'organization_id') INTO cm_has_org;

  IF to_regclass('public.cash_sessions') IS NOT NULL THEN
    IF cs_has_tenant AND cs_has_org THEN
      UPDATE public.cash_sessions cs SET business_id = COALESCE(cs.business_id, cs.tenant_id, cs.organization_id) WHERE cs.business_id IS NULL;
    ELSIF cs_has_tenant THEN
      UPDATE public.cash_sessions cs SET business_id = COALESCE(cs.business_id, cs.tenant_id) WHERE cs.business_id IS NULL;
    ELSIF cs_has_org THEN
      UPDATE public.cash_sessions cs SET business_id = COALESCE(cs.business_id, cs.organization_id) WHERE cs.business_id IS NULL;
    END IF;
  END IF;

  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    IF cm_has_tenant AND cm_has_org THEN
      UPDATE public.cash_movements cm
      SET business_id = COALESCE(cm.business_id, cm.tenant_id, cm.organization_id, (SELECT cs.business_id FROM public.cash_sessions cs WHERE cs.id = cm.session_id))
      WHERE cm.business_id IS NULL;
    ELSIF cm_has_tenant THEN
      UPDATE public.cash_movements cm
      SET business_id = COALESCE(cm.business_id, cm.tenant_id, (SELECT cs.business_id FROM public.cash_sessions cs WHERE cs.id = cm.session_id))
      WHERE cm.business_id IS NULL;
    ELSIF cm_has_org THEN
      UPDATE public.cash_movements cm
      SET business_id = COALESCE(cm.business_id, cm.organization_id, (SELECT cs.business_id FROM public.cash_sessions cs WHERE cs.id = cm.session_id))
      WHERE cm.business_id IS NULL;
    ELSE
      UPDATE public.cash_movements cm
      SET business_id = COALESCE(cm.business_id, (SELECT cs.business_id FROM public.cash_sessions cs WHERE cs.id = cm.session_id))
      WHERE cm.business_id IS NULL;
    END IF;
  END IF;
END $$;

-- 3.5 sale_items desde venta padre
DO $$
BEGIN
  IF to_regclass('public.sale_items') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'business_id')
  THEN
    UPDATE public.sale_items si
    SET business_id = s.business_id
    FROM public.sales s
    WHERE si.sale_id = s.id AND si.business_id IS NULL;
  END IF;
END $$;

-- 3.6 Tablas de suscripciones: renombrar si aplica
DO $$
BEGIN
  IF to_regclass('public.tenant_module_subscriptions') IS NOT NULL AND to_regclass('public.saas_module_entitlements') IS NULL THEN
    ALTER TABLE public.tenant_module_subscriptions RENAME TO saas_module_entitlements;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.saas_module_entitlements') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'saas_module_entitlements' AND column_name = 'tenant_id')
  THEN
    ALTER TABLE public.saas_module_entitlements RENAME COLUMN tenant_id TO business_id;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.subscription_customers') IS NOT NULL AND to_regclass('public.client_memberships') IS NULL THEN
    ALTER TABLE public.subscription_customers RENAME TO client_memberships;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.client_memberships') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_memberships' AND column_name = 'tenant_id')
  THEN
    ALTER TABLE public.client_memberships RENAME COLUMN tenant_id TO business_id;
  END IF;
END $$;

-- 3.7 Perfiles desde auth (no pisa nombres existentes)
INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 3.8 Trial: solo rellenar trial_ends_at vacío (no tocar billing_status aquí)
DO $$
BEGIN
  IF to_regclass('public.businesses') IS NOT NULL THEN
    UPDATE public.businesses b
    SET trial_ends_at = b.created_at + INTERVAL '7 days'
    WHERE b.trial_ends_at IS NULL;
  END IF;
END $$;
