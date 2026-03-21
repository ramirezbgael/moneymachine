-- =============================================================================
-- PHASE 1 — Tablas nuevas (no destructivo)
-- =============================================================================
-- No renombra columnas ni borra políticas. Puede ejecutarse con tráfico normal
-- si las tablas no existen (IF NOT EXISTS).
-- Requisito: al menos una de public.tenants | public.businesses para tablas FK.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Perfiles (sin FK a negocio aún — se añade en fase 2/5)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles (id);

-- SaaS Stripe mirror: business_id sin NOT NULL ni FK hasta fase 5
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_subscriptions_stripe_sub_unique
  ON public.saas_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_business
  ON public.saas_subscriptions (business_id)
  WHERE business_id IS NOT NULL;

-- Entitlements (no crear si existe nombre nuevo o legacy; fase 3 renombra legacy)
DO $$
BEGIN
  IF to_regclass('public.saas_module_entitlements') IS NOT NULL
     OR to_regclass('public.tenant_module_subscriptions') IS NOT NULL THEN
    RAISE NOTICE 'PHASE 1: omitir creación saas_module_entitlements (tabla ya presente).';
  ELSIF to_regclass('public.businesses') IS NOT NULL THEN
    EXECUTE $q$
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
    $q$;
  ELSIF to_regclass('public.tenants') IS NOT NULL THEN
    EXECUTE $q$
      CREATE TABLE IF NOT EXISTS public.saas_module_entitlements (
        id BIGSERIAL PRIMARY KEY,
        business_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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
    $q$;
  ELSE
    RAISE NOTICE 'PHASE 1: sin tenants/businesses — no se crea saas_module_entitlements.';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.client_memberships') IS NOT NULL
     OR to_regclass('public.subscription_customers') IS NOT NULL THEN
    RAISE NOTICE 'PHASE 1: omitir creación client_memberships (tabla ya presente).';
  ELSIF to_regclass('public.businesses') IS NOT NULL THEN
    EXECUTE $q$
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
    $q$;
  ELSIF to_regclass('public.tenants') IS NOT NULL THEN
    EXECUTE $q$
      CREATE TABLE IF NOT EXISTS public.client_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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
    $q$;
  ELSE
    RAISE NOTICE 'PHASE 1: sin tenants/businesses — no se crea client_memberships.';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.saas_module_entitlements') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_saas_module_entitlements_business ON public.saas_module_entitlements (business_id);
    CREATE INDEX IF NOT EXISTS idx_saas_module_entitlements_lookup ON public.saas_module_entitlements (business_id, module_key, status);
  END IF;
  IF to_regclass('public.client_memberships') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_client_memberships_business ON public.client_memberships (business_id);
    CREATE INDEX IF NOT EXISTS idx_client_memberships_business_status ON public.client_memberships (business_id, status);
    CREATE INDEX IF NOT EXISTS idx_client_memberships_end_date ON public.client_memberships (business_id, end_date);
  END IF;
END $$;
