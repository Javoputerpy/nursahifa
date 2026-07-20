
CREATE TABLE public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_review_date date,
  total_seconds integer NOT NULL DEFAULT 0,
  today_seconds integer NOT NULL DEFAULT 0,
  today_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own streak"
  ON public.user_streaks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_review_day(_seconds integer DEFAULT 0)
RETURNS public.user_streaks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _row public.user_streaks;
  _add integer := GREATEST(COALESCE(_seconds, 0), 0);
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.user_streaks AS us
    (user_id, current_streak, longest_streak, last_review_date, total_seconds, today_seconds, today_date, updated_at)
  VALUES
    (_uid, 1, 1, _today, _add, _add, _today, now())
  ON CONFLICT (user_id) DO UPDATE
    SET
      current_streak = CASE
        WHEN us.last_review_date = _today THEN us.current_streak
        WHEN us.last_review_date = _today - 1 THEN us.current_streak + 1
        ELSE 1
      END,
      longest_streak = GREATEST(
        us.longest_streak,
        CASE
          WHEN us.last_review_date = _today THEN us.current_streak
          WHEN us.last_review_date = _today - 1 THEN us.current_streak + 1
          ELSE 1
        END
      ),
      last_review_date = _today,
      total_seconds = us.total_seconds + _add,
      today_seconds = CASE
        WHEN us.today_date = _today THEN us.today_seconds + _add
        ELSE _add
      END,
      today_date = _today,
      updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_review_day(integer) TO authenticated;
