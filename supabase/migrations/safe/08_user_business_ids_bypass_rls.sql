-- Asegura que user_business_ids() lea memberships sin que RLS oculte filas al rol owner.
-- Si el owner de la función no bypassa RLS en tu versión de PG, esto lo fuerza.

CREATE OR REPLACE FUNCTION public.user_business_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
  SELECT business_id FROM public.memberships WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.user_business_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_business_ids() TO authenticated;
