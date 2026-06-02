BEGIN;

SELECT plan(8);

-- ────────────────────────────────────────────────────────────────
-- Role-permission assertions
-- ────────────────────────────────────────────────────────────────

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role = 'Supervisor' AND permission = 'invites:read'
    ),
    'Supervisor has invites:read'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role = 'Supervisor' AND permission = 'invites:write'
    ),
    'Supervisor has invites:write'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role = 'Member' AND permission = 'invites:read'
    ),
    'Member does not have invites:read'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role = 'Member' AND permission = 'invites:write'
    ),
    'Member does not have invites:write'
);

-- ────────────────────────────────────────────────────────────────
-- RLS policy assertions
-- ────────────────────────────────────────────────────────────────

SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invites' AND policyname = 'invites_select'),
    'invites_select policy exists'
);

SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invites' AND policyname = 'invites_write'),
    'invites_write policy exists'
);

SELECT ok(
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'invites' AND policyname = 'invites_all'),
    'invites_all policy is gone'
);

-- ────────────────────────────────────────────────────────────────
-- RLS behaviour simulation
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION pg_temp.as_role(p_role text) RETURNS void AS $$
BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object('user_role', p_role, 'sub',
            '20000000-0000-0000-0000-000000000001')::text,
        true);
END;
$$ LANGUAGE plpgsql;

-- Supervisor: SELECT allowed
SELECT pg_temp.as_role('Supervisor');
SELECT lives_ok(
    $$ SELECT 1 FROM public.invites $$,
    'invites_select: Supervisor can SELECT'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
