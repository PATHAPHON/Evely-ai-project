-- Fix handle_new_user() trigger function to match public.profiles schema
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
