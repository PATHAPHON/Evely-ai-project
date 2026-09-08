-- ============================================================================
-- EvelyAI — Word Images Cache Table & Storage
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.word_images (
  word text PRIMARY KEY,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for word lookups
CREATE INDEX IF NOT EXISTS word_images_word_idx ON public.word_images(word);

-- Enable RLS
ALTER TABLE public.word_images ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/authenticated) to read cached images
CREATE POLICY "Anyone can read word images"
  ON public.word_images FOR SELECT
  USING (true);

-- Allow authenticated users and service role to insert cached images
CREATE POLICY "Authenticated users can insert word images"
  ON public.word_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Storage bucket setup for word-images
INSERT INTO storage.buckets (id, name, public)
VALUES ('word-images', 'word-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to storage bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for word-images'
  ) THEN
    CREATE POLICY "Public Access for word-images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'word-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated uploads for word-images'
  ) THEN
    CREATE POLICY "Authenticated uploads for word-images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'word-images');
  END IF;
END $$;
