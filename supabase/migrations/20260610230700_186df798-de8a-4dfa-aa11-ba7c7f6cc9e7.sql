
DROP VIEW IF EXISTS public.bot_status_view;
CREATE VIEW public.bot_status_view WITH (security_invoker = true) AS
  SELECT bot_id, status, last_heartbeat, last_message, updated_at,
         (now() - last_heartbeat) > INTERVAL '30 seconds' AS offline
  FROM public.bot_status;
GRANT SELECT ON public.bot_status_view TO service_role;
