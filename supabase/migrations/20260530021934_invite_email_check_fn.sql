CREATE OR REPLACE FUNCTION public.email_has_profile(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(p_email)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.email_has_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_has_profile(text) TO authenticated;
