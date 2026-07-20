
-- Daily scan limits: track how many scans each user has done today
CREATE TABLE public.scan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  scan_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_scan_limits_user_date ON public.scan_limits (user_id, scan_date);

GRANT SELECT, INSERT, UPDATE ON public.scan_limits TO authenticated;
GRANT ALL ON public.scan_limits TO service_role;

ALTER TABLE public.scan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scan limits"
  ON public.scan_limits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- AI scan cache: store extracted words from scanned images to avoid re-calling AI
CREATE TABLE public.scan_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_hash text NOT NULL,
  words jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_scan_cache_hash ON public.scan_cache (image_hash);

GRANT SELECT, INSERT ON public.scan_cache TO authenticated;
GRANT ALL ON public.scan_cache TO service_role;

ALTER TABLE public.scan_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scan cache"
  ON public.scan_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert scan cache"
  ON public.scan_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function: increment daily scan count and return current count
CREATE OR REPLACE FUNCTION public.increment_scan_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _count integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.scan_limits (user_id, scan_date, scan_count)
  VALUES (_uid, _today, 1)
  ON CONFLICT (user_id, scan_date) DO UPDATE
    SET scan_count = public.scan_limits.scan_count + 1
  RETURNING scan_count INTO _count;

  RETURN _count;
END;
$$;

-- Function: get current daily scan count
CREATE OR REPLACE FUNCTION public.get_scan_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _count integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT scan_count INTO _count
  FROM public.scan_limits
  WHERE user_id = _uid AND scan_date = _today;

  RETURN COALESCE(_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_scan_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scan_count() TO authenticated;
