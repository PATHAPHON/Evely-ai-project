-- ============================================================================
-- Migration: Add Admin username and unlimited token support
-- ============================================================================

-- 1. Update check_budget RPC to grant unlimited budget to unlimited status and admin handle
CREATE OR REPLACE FUNCTION public.check_budget(p_limit_microbaht integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_spent integer;
  v_reset_at date;
  v_sub_status text;
  v_handle text;
BEGIN
  SELECT daily_spend_microbaht, daily_spend_reset_at, subscription_status, handle
  INTO v_spent, v_reset_at, v_sub_status, v_handle
  FROM profiles WHERE id = auth.uid();

  IF NOT FOUND THEN RETURN false; END IF;

  -- Unlimited / Admin users always have budget
  IF v_sub_status = 'unlimited' OR v_handle = 'admin' THEN
    RETURN true;
  END IF;

  IF v_reset_at IS NULL OR v_reset_at < (now() AT TIME ZONE 'Asia/Bangkok')::date THEN
    UPDATE profiles SET daily_spend_microbaht = 0, daily_spend_reset_at = (now() AT TIME ZONE 'Asia/Bangkok')::date WHERE id = auth.uid();
    v_spent := 0;
  END IF;

  RETURN v_spent < p_limit_microbaht;
END;
$function$;

-- 2. Update existing admin user profile (if present)
UPDATE public.profiles
SET
  handle = 'admin',
  display_name = 'Admin',
  subscription_status = 'unlimited',
  daily_spend_microbaht = 0,
  updated_at = now()
WHERE id = 'b15a6aea-051f-4f0a-8dec-cee624c816d0';
