-- is_email_allowed: anon-callable RPC that returns true if the email belongs
-- to a pending invite or an existing registered user. SECURITY DEFINER so it
-- can read auth.users without exposing the table to the client.
CREATE OR REPLACE FUNCTION public.is_email_allowed(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invites  WHERE email = lower(p_email)
    UNION ALL
    SELECT 1 FROM auth.users      WHERE email = lower(p_email)
    LIMIT 1
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO anon, authenticated;
