-- ============================================================================
-- GeeGeeJobLa (จีจีจบล่ะ) — Initial Database Schema Migration
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Learner',
  handle text UNIQUE,
  daily_spend_microbaht integer NOT NULL DEFAULT 0 CHECK (daily_spend_microbaht >= 0),
  daily_spend_reset_at date NOT NULL DEFAULT CURRENT_DATE,
  target_language text NOT NULL DEFAULT 'english',
  ui_language text NOT NULL DEFAULT 'th',
  subscription_status text NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  subscription_current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. words (Personal vocabulary bank)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  word text,
  english text,
  language text NOT NULL DEFAULT 'english' CHECK (language = 'english'),
  thai text,
  part_of_speech text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS words_user_id_idx ON public.words(user_id);
CREATE INDEX IF NOT EXISTS words_word_idx ON public.words(word);

ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own words"
  ON public.words FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words"
  ON public.words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own words"
  ON public.words FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own words"
  ON public.words FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. word_progress (SM-2 Spaced Repetition tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.word_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  box integer NOT NULL DEFAULT 1 CHECK (box >= 1),
  interval integer NOT NULL DEFAULT 1 CHECK (interval >= 0),
  ease_factor numeric NOT NULL DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  repetitions integer NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  last_reviewed_at timestamptz NOT NULL DEFAULT now(),
  next_review_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT word_progress_user_word_unique UNIQUE (user_id, word_id)
);

CREATE INDEX IF NOT EXISTS word_progress_user_id_idx ON public.word_progress(user_id);
CREATE INDEX IF NOT EXISTS word_progress_due_idx ON public.word_progress(user_id, next_review_at);

ALTER TABLE public.word_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own word progress"
  ON public.word_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own word progress"
  ON public.word_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own word progress"
  ON public.word_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own word progress"
  ON public.word_progress FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. conversations (Chat sessions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  completed boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id, created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. conversation_messages (Chat messages)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  english_text text,
  translation text,
  english text,
  english_phrases text,
  raw_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_messages_session_idx ON public.conversation_messages(session_id, created_at ASC);

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of own conversations"
  ON public.conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_messages.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own conversations"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_messages.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages of own conversations"
  ON public.conversation_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_messages.session_id AND user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 6. ai_word_detail_cache (Permanent shared cache for LLM lookups)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_word_detail_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  word text NOT NULL,
  language text NOT NULL DEFAULT 'english' CHECK (language = 'english'),
  english text,
  part_of_speech text,
  model text NOT NULL,
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_word_detail_cache_key_idx ON public.ai_word_detail_cache(cache_key);
CREATE INDEX IF NOT EXISTS ai_word_detail_word_idx ON public.ai_word_detail_cache(word);

ALTER TABLE public.ai_word_detail_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read word detail cache"
  ON public.ai_word_detail_cache FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 7. stripe_events (Webhook idempotency ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No public RLS policies: accessed only via service-role key in webhook

-- ----------------------------------------------------------------------------
-- 8. Auth Trigger: auto-create profiles row on auth.users creation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, handle, target_language, ui_language)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'displayName', new.raw_user_meta_data->>'full_name', 'Learner'),
    COALESCE(new.raw_user_meta_data->>'handle', NULL),
    COALESCE(new.raw_user_meta_data->>'target_language', 'english'),
    COALESCE(new.raw_user_meta_data->>'ui_language', 'th')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 9. Daily Budget RPCs
-- ----------------------------------------------------------------------------
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
  SELECT daily_spend_microbaht, daily_spend_reset_at INTO v_spent, v_reset_at
  FROM profiles WHERE id = auth.uid();

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_reset_at IS NULL OR v_reset_at < (now() AT TIME ZONE 'Asia/Bangkok')::date THEN
    UPDATE profiles SET daily_spend_microbaht = 0, daily_spend_reset_at = (now() AT TIME ZONE 'Asia/Bangkok')::date WHERE id = auth.uid();
    v_spent := 0;
  END IF;

  RETURN v_spent < p_limit_microbaht;
END;
$function$;

CREATE OR REPLACE FUNCTION public.debit_budget(p_cost_microbaht integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE profiles
  SET daily_spend_microbaht = daily_spend_microbaht + p_cost_microbaht
  WHERE id = auth.uid();
END;
$function$;
