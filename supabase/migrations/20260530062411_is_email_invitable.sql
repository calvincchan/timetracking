-- is_email_invitable: authenticated-callable RPC that returns true when the
-- email has not yet been registered. Used by InviteCreate to block inviting
-- an already-registered user before the form is submitted.
CREATE OR REPLACE FUNCTION public.is_email_invitable(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(p_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_email_invitable(text) TO authenticated;
