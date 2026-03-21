-- =============================================================================
-- PHASE 5 — Restricciones, limpieza, funciones RPC, triggers y vistas
-- =============================================================================
-- Ejecutar SOLO si fase 4 está limpia. Incluye todo lo necesario ANTES del RLS
-- (funciones user_business_ids / has_business_role deben existir antes de fase 6).
-- Puede bloquear tablas grandes brevemente al crear índices únicos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5.A Restricciones, NOT NULL, DROP columnas legacy, índices únicos
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.businesses') IS NOT NULL THEN
    UPDATE public.businesses SET billing_status = 'trialing' WHERE billing_status IS NULL;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_billing_status_check') THEN
      ALTER TABLE public.businesses
        ADD CONSTRAINT businesses_billing_status_check CHECK (
          billing_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')
        );
    END IF;

    ALTER TABLE public.businesses ALTER COLUMN billing_status SET DEFAULT 'trialing';
    ALTER TABLE public.businesses ALTER COLUMN billing_status SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_stripe_customer_unique
  ON public.businesses (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND to_regclass('public.businesses') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_default_business_id_fkey')
  THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_default_business_id_fkey
      FOREIGN KEY (default_business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'PHASE 5: no se pudo añadir FK profiles.default_business_id — %', SQLERRM;
END $$;

DO $$
DECLARE
  n bigint;
BEGIN
  IF to_regclass('public.saas_subscriptions') IS NULL OR to_regclass('public.businesses') IS NULL THEN
    RETURN;
  END IF;
  SELECT COUNT(*) INTO n FROM public.saas_subscriptions WHERE business_id IS NULL;
  IF n > 0 THEN
    RAISE NOTICE 'PHASE 5: saas_subscriptions tiene % filas con business_id NULL — omitiendo NOT NULL/FK.', n;
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saas_subscriptions_business_id_fkey') THEN
    ALTER TABLE public.saas_subscriptions
      ADD CONSTRAINT saas_subscriptions_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
  ALTER TABLE public.saas_subscriptions ALTER COLUMN business_id SET NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saas_subscriptions_status_check') THEN
    ALTER TABLE public.saas_subscriptions
      ADD CONSTRAINT saas_subscriptions_status_check CHECK (
        status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')
      );
  END IF;
END $$;

DO $$
DECLARE
  n bigint;
BEGIN
  IF to_regclass('public.cash_sessions') IS NULL THEN
    RETURN;
  END IF;
  SELECT COUNT(*) INTO n FROM public.cash_sessions WHERE business_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'PHASE 5 ABORT: cash_sessions aún tiene % filas con business_id NULL', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_business_id_fkey') THEN
    ALTER TABLE public.cash_sessions
      ADD CONSTRAINT cash_sessions_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
  ALTER TABLE public.cash_sessions ALTER COLUMN business_id SET NOT NULL;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_sessions' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.cash_sessions DROP COLUMN tenant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_sessions' AND column_name = 'organization_id') THEN
    ALTER TABLE public.cash_sessions DROP COLUMN organization_id;
  END IF;
END $$;

DO $$
DECLARE
  n bigint;
BEGIN
  IF to_regclass('public.cash_movements') IS NULL THEN
    RETURN;
  END IF;
  SELECT COUNT(*) INTO n FROM public.cash_movements WHERE business_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'PHASE 5 ABORT: cash_movements aún tiene % filas con business_id NULL', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_movements_business_id_fkey') THEN
    ALTER TABLE public.cash_movements
      ADD CONSTRAINT cash_movements_business_id_fkey
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
  ALTER TABLE public.cash_movements ALTER COLUMN business_id SET NOT NULL;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_movements' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.cash_movements DROP COLUMN tenant_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_movements' AND column_name = 'organization_id') THEN
    ALTER TABLE public.cash_movements DROP COLUMN organization_id;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.cash_sessions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_cash_sessions_business_status ON public.cash_sessions (business_id, status);
  END IF;
  IF to_regclass('public.cash_movements') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_cash_movements_business ON public.cash_movements (business_id);
  END IF;
END $$;

DO $$
DECLARE
  n bigint;
BEGIN
  IF to_regclass('public.sale_items') IS NULL THEN
    RETURN;
  END IF;
  SELECT COUNT(*) INTO n FROM public.sale_items WHERE business_id IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'PHASE 5 ABORT: sale_items tiene % filas con business_id NULL', n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_business_id_fkey') THEN
    BEGIN
      ALTER TABLE public.sale_items
        ADD CONSTRAINT sale_items_business_id_fkey
        FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
  ALTER TABLE public.sale_items ALTER COLUMN business_id SET NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_sale_items_business ON public.sale_items (business_id);

DO $$
DECLARE
  r TEXT;
  tables TEXT[] := ARRAY['products','customers','sales','quotations','finance_customers','accounts_receivable','payments'];
BEGIN
  FOREACH r IN ARRAY tables
  LOOP
    IF to_regclass('public.' || r) IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = r AND column_name = 'tenant_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = r AND column_name = 'business_id')
    THEN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN tenant_id', r);
    END IF;
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.idx_products_tenant_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_business_code ON public.products (business_id, code);

DROP INDEX IF EXISTS public.idx_customers_tenant_phone;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_business_phone ON public.customers (business_id, phone) WHERE phone IS NOT NULL;

DROP INDEX IF EXISTS public.idx_sales_tenant_sale_number;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_business_sale_number ON public.sales (business_id, sale_number);

DO $$
BEGIN
  IF to_regclass('public.quotations') IS NOT NULL THEN
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
-- 5.B Funciones, triggers, vista (requerido antes de políticas RLS en fase 6)
-- -----------------------------------------------------------------------------

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

CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT * FROM public.user_business_ids(); $$;

REVOKE ALL ON FUNCTION public.user_tenant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_tenant_ids() TO authenticated;

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

CREATE OR REPLACE FUNCTION public.create_tenant_and_join(p_name TEXT, p_slug TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.create_business_and_membership(p_name, p_slug); $$;

REVOKE ALL ON FUNCTION public.create_tenant_and_join(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_and_join(TEXT, TEXT) TO authenticated;

-- Misma firma (uuid, text) que la versión legacy con p_tenant_id: PG no permite renombrar parámetros con REPLACE.
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

-- REPLACE no puede renombrar columnas de la vista (tenant_id → business_id); recrear.
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
