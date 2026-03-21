-- =============================================================================
-- 08_POSTCHECKS — Tras fase 6 / RLS (smoke tests de lectura)
-- =============================================================================

-- Políticas creadas en tablas críticas
SELECT tablename, COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = ANY (ARRAY['products','sales','memberships','businesses','cash_sessions'])
GROUP BY tablename
ORDER BY tablename;

-- Funciones helper expuestas a authenticated
SELECT routine_name
FROM information_schema.routine_privileges
WHERE grantee = 'authenticated'
  AND routine_schema = 'public'
  AND routine_name IN ('user_business_ids','has_business_role','create_business_and_membership')
ORDER BY 1;
