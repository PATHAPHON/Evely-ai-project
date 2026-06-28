-- Budget tracking: per-user daily spend in micro-baht (µ฿).
-- profiles.energy  = µ฿ spent today  (default 0, reset daily via check_budget)
-- profiles.energy_reset_at = last reset date (Bangkok timezone)
--
-- Applied manually to Supabase dashboard; this file documents the live schema.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS energy          integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS energy_reset_at date     NOT NULL DEFAULT CURRENT_DATE;

-- Returns true when the caller has remaining budget, auto-resets spend at midnight Bangkok time.
CREATE OR REPLACE FUNCTION public.check_budget(p_limit_microbaht integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_spent integer;
  v_reset_at date;
BEGIN
  SELECT energy, energy_reset_at INTO v_spent, v_reset_at
  FROM profiles WHERE id = auth.uid();

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_reset_at IS NULL OR v_reset_at < (now() AT TIME ZONE 'Asia/Bangkok')::date THEN
    UPDATE profiles SET energy = 0, energy_reset_at = (now() AT TIME ZONE 'Asia/Bangkok')::date WHERE id = auth.uid();
    v_spent := 0;
  END IF;

  RETURN v_spent < p_limit_microbaht;
END;
$function$;

-- Adds cost to today's spend. Called after each LLM response via after().
CREATE OR REPLACE FUNCTION public.debit_budget(p_cost_microbaht integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET energy = energy + p_cost_microbaht
  WHERE id = auth.uid();
END;
$function$;
