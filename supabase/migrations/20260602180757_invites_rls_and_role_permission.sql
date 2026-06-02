-- Grant Supervisor invites:read; split invites_all into select + write policies.

INSERT INTO public.role_permissions (role, permission)
VALUES ('Supervisor', 'invites:read')
ON CONFLICT DO NOTHING;

-- Replace catch-all policy with separate select / write policies
DROP POLICY IF EXISTS "invites_all" ON public.invites;

CREATE POLICY "invites_select"
    ON public.invites FOR SELECT
    USING (public.has_role_permission('invites:read'));

CREATE POLICY "invites_write"
    ON public.invites FOR ALL
    USING (public.has_role_permission('invites:write'))
    WITH CHECK (public.has_role_permission('invites:write'));
