-- =============================================================================
-- PHASE 6 — Row Level Security (ÚLTIMO paso obligatorio del plan de 6 fases)
-- =============================================================================
-- Requiere haber ejecutado la fase 5 (funciones user_business_ids / has_business_role).
-- Ventana de riesgo: entre DROP masivo de políticas y CREATE, el acceso puede fallar.
-- Ejecutar en bajo tráfico; idealmente pegar fase 5 y fase 6 en la misma sesión seguidas.
-- =============================================================================

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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY businesses_select_member ON public.businesses
  FOR SELECT USING (id IN (SELECT public.user_business_ids()));
CREATE POLICY businesses_update_privileged ON public.businesses
  FOR UPDATE
  USING (public.has_business_role(id, 'owner', 'admin', 'billing'))
  WITH CHECK (public.has_business_role(id, 'owner', 'admin', 'billing'));

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
-- Importante: NO usar política recursiva para SELECT en memberships.
-- user_business_ids() lee memberships; si el SELECT a memberships depende de user_business_ids()
-- se queda en "cero filas" al arrancar y el cliente cree que no hay negocio.
CREATE POLICY memberships_select_own ON public.memberships
  FOR SELECT USING (user_id = auth.uid());
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
  IF to_regclass('public.quotations') IS NOT NULL THEN
    ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS quotations_all ON public.quotations';
    EXECUTE 'CREATE POLICY quotations_all ON public.quotations FOR ALL
      USING (business_id IN (SELECT public.user_business_ids()))
      WITH CHECK (business_id IN (SELECT public.user_business_ids()))';
  END IF;
END $$;

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
