-- =============================================================================
-- 99_ROLLBACK_HELPERS — Referencia (no ejecutar a ciegas)
-- =============================================================================
-- PostgreSQL no soporta “undo” de DDL. Opciones reales:
--   1) Restaurar backup (pg_dump / Point-in-Time / clonar proyecto Supabase).
--   2) Revertir manualmente con DDL inverso (riesgoso si ya hay datos nuevos).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Copia lógica ANTES de fases destructivas (ejecutar tú antes del cambio)
-- -----------------------------------------------------------------------------
-- COPY (SELECT * FROM public.products) TO STDOUT WITH CSV HEADER;
-- COPY (SELECT * FROM public.sales) TO STDOUT WITH CSV HEADER;
-- En Supabase: Table → Export, o pg_dump desde CLI con service role en string de conexión.

-- -----------------------------------------------------------------------------
-- B) Ejemplos de reversión parcial (solo si conoces el estado previo exacto)
-- -----------------------------------------------------------------------------

-- Renombrar businesses → tenants (solo si no hay FKs nuevas que impidan el nombre)
-- ALTER TABLE public.businesses RENAME TO tenants;

-- Recrear columna tenant_id en caja (NO recupera datos borrados — solo estructura)
-- ALTER TABLE public.cash_sessions ADD COLUMN tenant_id UUID;
-- UPDATE ... manual desde backup

-- Desactivar RLS temporalmente en emergencia (expone datos — solo diagnóstico)
-- ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- C) Listar políticas actuales para comparar con backup de definiciones
-- -----------------------------------------------------------------------------
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
