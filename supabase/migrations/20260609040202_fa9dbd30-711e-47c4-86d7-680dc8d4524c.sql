
CREATE TABLE public.telegram_user_modes (
  chat_id BIGINT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'idle',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_user_modes TO service_role;
ALTER TABLE public.telegram_user_modes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service only" ON public.telegram_user_modes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.telegram_feedback_map (
  admin_message_id BIGINT PRIMARY KEY,
  user_chat_id BIGINT NOT NULL,
  user_message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_feedback_map TO service_role;
ALTER TABLE public.telegram_feedback_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service only fb" ON public.telegram_feedback_map FOR ALL TO service_role USING (true) WITH CHECK (true);
