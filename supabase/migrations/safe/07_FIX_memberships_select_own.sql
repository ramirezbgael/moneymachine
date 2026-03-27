-- =============================================================================
-- FIX: lectura de memberships con el cliente (anon + JWT)
-- La política memberships_select_same_business (business_id IN user_business_ids())
-- depende de que la función SECURITY DEFINER lea memberships sin quedar bloqueada
-- por RLS en algunos entornos. Sin filas visibles, loadTenants() siempre ve 0
-- memberships y la app pide "crear negocio" en cada recarga.
-- Política estándar: cada usuario ve sus propias filas.
-- =============================================================================

DROP POLICY IF EXISTS memberships_select_own ON public.memberships;
DROP POLICY IF EXISTS memberships_select_same_business ON public.memberships;

CREATE POLICY memberships_select_own ON public.memberships
  FOR SELECT
  USING (user_id = auth.uid());
