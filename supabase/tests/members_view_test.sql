BEGIN;

SELECT plan(3);

-- ────────────────────────────────────────────────────────────────
-- RLS simulation helpers (same pattern as categories_test.sql)
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

-- Seed one user so the members view has at least one row to return.
-- Use replica role to bypass handle_new_user trigger (which requires either
-- an empty profiles table or a matching invite).
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, email)
VALUES ('20000000-0000-0000-0000-000000000001', 'supervisor@example.com');
INSERT INTO public.profiles (id, full_name, role)
VALUES ('20000000-0000-0000-0000-000000000001', 'Test Supervisor', 'Supervisor');
SET LOCAL session_replication_role = DEFAULT;

-- Supervisor: SELECT allowed
SELECT pg_temp.as_role('Supervisor');
SELECT lives_ok(
    $$ SELECT 1 FROM public.members $$,
    'members_select: Supervisor can SELECT');

-- Supervisor sees the seeded row
SELECT is(
    (SELECT COUNT(*)::int > 0 FROM public.members),
    true,
    'members_select: Supervisor sees at least one row');

RESET ROLE;

-- Member: SELECT returns 0 rows (WHERE clause filters them out)
SELECT pg_temp.as_role('Member');
SELECT is(
    (SELECT COUNT(*)::int FROM public.members),
    0,
    'members_select: Member sees zero rows');

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
