
ALTER TABLE public.words
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interval_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mastery_level text NOT NULL DEFAULT 'new';

CREATE INDEX IF NOT EXISTS words_user_due_idx ON public.words (user_id, next_review_at);

CREATE TABLE IF NOT EXISTS public.review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  rating text NOT NULL,
  interval_minutes integer NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_history TO authenticated;
GRANT ALL ON public.review_history TO service_role;

ALTER TABLE public.review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own review history"
  ON public.review_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS review_history_user_idx ON public.review_history (user_id, reviewed_at DESC);
