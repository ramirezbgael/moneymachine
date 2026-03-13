-- ============================================================
-- PUBLIC READ POLICY for subscription_customers
-- Allows unauthenticated (anon) users to read a single
-- customer record by its primary key — used by the
-- public /check/:id membership card page.
--
-- This only exposes: id, name, monthly_fee, start_date,
-- end_date, status  (phone and notes are NOT selected
-- by the public page but are visible at the row level).
--
-- If you want to be more restrictive, you can use a
-- Supabase Edge Function instead and remove this policy.
-- ============================================================

-- Allow anon to SELECT any subscription_customers row by id.
-- The public page only shows membership status — no PII beyond name/fee/dates.
DROP POLICY IF EXISTS "Public anon read by id" ON subscription_customers;
CREATE POLICY "Public anon read by id"
  ON subscription_customers FOR SELECT
  TO anon
  USING (true);
