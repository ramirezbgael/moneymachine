-- =============================================================================
-- PHASE 4 — Validación (solo lectura + avisos; no altera esquema)
-- =============================================================================
-- Revisa los resultados. Si algún conteo es > 0, NO ejecutes fase 5 hasta corregir.
-- Opcional: descomenta el bloque final para abortar con excepción si hay bloqueos.
-- =============================================================================

-- V1) Caja sin business_id (omitir si no usas estas tablas — comenta el SELECT)
SELECT 'cash_sessions_null_business' AS check_id, COUNT(*) AS bad_rows
FROM public.cash_sessions
WHERE business_id IS NULL;

SELECT 'cash_movements_null_business' AS check_id, COUNT(*) AS bad_rows
FROM public.cash_movements
WHERE business_id IS NULL;

-- V2) Ventas / ítems sin negocio
SELECT 'sales_null_business' AS check_id, COUNT(*) AS bad_rows
FROM public.sales s
WHERE s.business_id IS NULL;

SELECT 'sale_items_null_business' AS check_id, COUNT(*) AS bad_rows
FROM public.sale_items si
WHERE si.business_id IS NULL;

-- V3) Duplicados que impedirían índice único (products)
SELECT 'products_dup_code_per_business' AS check_id, COUNT(*) AS bad_rows
FROM (
  SELECT business_id, code FROM public.products
  GROUP BY business_id, code
  HAVING COUNT(*) > 1
) d;

-- V4) memberships huérfanos (business_id inexistente)
SELECT 'memberships_orphan_business' AS check_id, COUNT(*) AS bad_rows
FROM public.memberships m
WHERE NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = m.business_id);

-- V5) saas_subscriptions con business_id NULL (esperable si aún no usas la tabla; antes de NOT NULL deben ser 0)
SELECT 'saas_subscriptions_null_business' AS check_id, COUNT(*) AS bad_rows
FROM public.saas_subscriptions
WHERE business_id IS NULL;

-- -----------------------------------------------------------------------------
-- Opcional: fallar explícitamente si hay filas bloqueantes (descomenta para usar)
-- -----------------------------------------------------------------------------
/*
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT COUNT(*) INTO n FROM public.cash_sessions WHERE business_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'PHASE 4 FAIL: cash_sessions.business_id NULL count=%', n; END IF;

  SELECT COUNT(*) INTO n FROM public.cash_movements WHERE business_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'PHASE 4 FAIL: cash_movements.business_id NULL count=%', n; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'business_id' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO n FROM public.sales WHERE business_id IS NULL;
    IF n > 0 THEN RAISE EXCEPTION 'PHASE 4 FAIL: sales.business_id NULL count=%', n; END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'business_id' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO n FROM public.sale_items WHERE business_id IS NULL;
    IF n > 0 THEN RAISE EXCEPTION 'PHASE 4 FAIL: sale_items.business_id NULL count=%', n; END IF;
  END IF;
END $$;
*/
