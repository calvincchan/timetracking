CREATE OR REPLACE FUNCTION public.is_email_allowed(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM public.profiles)   -- no users yet → first-user setup
    OR EXISTS (
      SELECT 1 FROM public.invites WHERE email = lower(p_email)
      UNION ALL
      SELECT 1 FROM auth.users     WHERE email = lower(p_email)
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO anon, authenticated;
