-- =============================================================================
-- PHASE 2 — Columnas nuevas solo NULL (sin NOT NULL forzado)
-- =============================================================================
-- Idempotente. No borra columnas legacy (tenant_id, organization_id).
-- =============================================================================

-- Negocio: columnas SaaS sin reescribir facturación existente
DO $$
BEGIN
  IF to_regclass('public.businesses') IS NOT NULL THEN
    ALTER TABLE public.businesses
      ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS billing_status TEXT,
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
  ELSIF to_regclass('public.tenants') IS NOT NULL THEN
    ALTER TABLE public.tenants
      ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS billing_status TEXT,
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
  END IF;
END $$;

-- Perfiles → negocio por defecto (FK en fase 5 tras validar integridad)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_business_id UUID;

-- Caja: columna canónica paralela a tenant_id / organization_id
DO $$
BEGIN
  IF to_regclass('public.cash_sessions') IS NOT NULL THEN
    ALTER TABLE public.cash_sessions
      ADD COLUMN IF NOT EXISTS business_id UUID;
  END IF;
  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    ALTER TABLE public.cash_movements
      ADD COLUMN IF NOT EXISTS business_id UUID;
  END IF;
END $$;

-- Líneas de venta: denormalizado (relleno en fase 3)
DO $$
BEGIN
  IF to_regclass('public.sale_items') IS NOT NULL THEN
    ALTER TABLE public.sale_items
      ADD COLUMN IF NOT EXISTS business_id UUID;
  END IF;
END $$;
