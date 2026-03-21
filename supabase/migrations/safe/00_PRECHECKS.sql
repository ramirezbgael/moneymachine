-- =============================================================================
-- 00_PRECHECKS — Solo lectura (no modifica la base de datos)
-- =============================================================================
-- Ejecutar antes de cualquier fase. Revisar resultados manualmente.
-- =============================================================================

-- 1) ¿Existe el núcleo multi-tenant?
SELECT 'tenants' AS entity, EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'tenants'
) AS exists;
SELECT 'businesses' AS entity, EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'businesses'
) AS exists;
SELECT 'tenant_members' AS entity, EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'tenant_members'
) AS exists;
SELECT 'memberships' AS entity, EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'memberships'
) AS exists;

-- 2) Columnas tenant_id vs business_id en tablas operativas (ajusta lista si añades tablas)
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'products','customers','sales','sale_items','quotations',
    'finance_customers','accounts_receivable','payments',
    'cash_sessions','cash_movements','registers'
  )
  AND column_name IN ('tenant_id','business_id','organization_id')
ORDER BY table_name, column_name;

-- 3) Conteo de negocios / miembros
DO $$
BEGIN
  IF to_regclass('public.businesses') IS NOT NULL THEN
    RAISE NOTICE 'businesses count: %', (SELECT COUNT(*) FROM public.businesses);
  ELSIF to_regclass('public.tenants') IS NOT NULL THEN
    RAISE NOTICE 'tenants count: %', (SELECT COUNT(*) FROM public.tenants);
  ELSE
    RAISE NOTICE 'No businesses/tenants table — detener migración hasta crear modelo tenant.';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.memberships') IS NOT NULL THEN
    RAISE NOTICE 'memberships count: %', (SELECT COUNT(*) FROM public.memberships);
  ELSIF to_regclass('public.tenant_members') IS NOT NULL THEN
    RAISE NOTICE 'tenant_members count: %', (SELECT COUNT(*) FROM public.tenant_members);
  END IF;
END $$;

-- 4) Duplicados products (ejecutar manualmente según tu columna activa):
--    Con business_id:
--      SELECT business_id, code, COUNT(*) FROM public.products GROUP BY 1,2 HAVING COUNT(*) > 1;
--    Con tenant_id solamente:
--      SELECT tenant_id, code, COUNT(*) FROM public.products GROUP BY 1,2 HAVING COUNT(*) > 1;

-- 5) Integridad referencial (tablas deben existir)
DO $$
BEGIN
  IF to_regclass('public.sale_items') IS NOT NULL AND to_regclass('public.sales') IS NOT NULL THEN
    RAISE NOTICE 'sale_items huérfanos (sin sale): %',
      (SELECT COUNT(*) FROM public.sale_items si WHERE NOT EXISTS (SELECT 1 FROM public.sales s WHERE s.id = si.sale_id));
  END IF;
END $$;

-- 6) Políticas RLS actuales (inventario)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = ANY (ARRAY[
    'products','customers','sales','sale_items','businesses','tenants','memberships','tenant_members'
  ])
ORDER BY tablename, policyname;
