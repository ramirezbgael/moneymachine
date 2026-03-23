-- Opcional: eventos de entrada/salida por suscriptor (asistencia / gym).
-- Ejecutar en Supabase SQL editor si quieres tabla canónica; el front también intenta gym_checkins/checkins.
--
-- Requisitos: public.businesses y public.client_memberships con business_id.

CREATE TABLE IF NOT EXISTS public.subscription_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  client_membership_id uuid NOT NULL REFERENCES public.client_memberships (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('entry', 'exit')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text DEFAULT 'pos',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_access_business_time
  ON public.subscription_access_events (business_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_access_membership_time
  ON public.subscription_access_events (client_membership_id, occurred_at DESC);

ALTER TABLE public.subscription_access_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_access_events_business_all ON public.subscription_access_events;
CREATE POLICY subscription_access_events_business_all ON public.subscription_access_events
  FOR ALL
  USING (business_id IN (SELECT public.user_business_ids()))
  WITH CHECK (business_id IN (SELECT public.user_business_ids()));

COMMENT ON TABLE public.subscription_access_events IS 'Entradas/salidas de suscriptores; alimenta insights en el módulo Suscripciones.';
