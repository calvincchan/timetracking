BEGIN;

SELECT plan(14);

-- ────────────────────────────────────────────────────────────────
-- Setup: users, profiles, categories, time entries
-- Use session_replication_role = replica to bypass handle_new_user
-- trigger and insert test data directly.
-- ────────────────────────────────────────────────────────────────
SET LOCAL session_replication_role = replica;

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'pgtap-rpt-supervisor@localhost', '{}'),
    ('20000000-0000-0000-0000-000000000002', 'pgtap-rpt-member@localhost',     '{}');

INSERT INTO public.profiles (id, full_name, role, employment_type)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Test Supervisor', 'Supervisor', 'paid'),
    ('20000000-0000-0000-0000-000000000002', 'Test Member',     'Member',     'volunteer');

SET LOCAL session_replication_role = DEFAULT;

INSERT INTO public.categories (id, name)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Admin');

-- Set JWT claims so the audit trigger's auth.uid() resolves to the Supervisor profile
SELECT set_config(
    'request.jwt.claims',
    '{"sub": "10000000-0000-0000-0000-000000000001", "user_role": "Supervisor"}',
    true);

-- 3 unlocked entries: 2 for Supervisor user, 1 for Member user
INSERT INTO public.time_entries (id, user_id, entry_date, duration_minutes, category_id, note)
VALUES
    ('e1000000-0000-0000-0000-000000000001',
     '10000000-0000-0000-0000-000000000001', '2026-01-10', 60,
     'aaaaaaaa-0000-0000-0000-000000000001', 'Entry 1'),
    ('e2000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000001', '2026-01-15', 90,
     'aaaaaaaa-0000-0000-0000-000000000001', 'Entry 2'),
    ('e3000000-0000-0000-0000-000000000003',
     '20000000-0000-0000-0000-000000000002', '2026-01-20', 45,
     'aaaaaaaa-0000-0000-0000-000000000001', 'Entry 3');

-- ────────────────────────────────────────────────────────────────
-- preview_report
-- ────────────────────────────────────────────────────────────────

SELECT is(
    (SELECT entry_count FROM public.preview_report('2026-01-01', '2026-01-31')),
    3,
    'preview_report: correct entry_count for full period');

SELECT is(
    (SELECT member_count FROM public.preview_report('2026-01-01', '2026-01-31')),
    2,
    'preview_report: correct member_count for full period');

SELECT is(
    (SELECT entry_count FROM public.preview_report(
        '2026-01-01', '2026-01-31',
        '10000000-0000-0000-0000-000000000001'::uuid)),
    2,
    'preview_report: user_id filter returns correct entry_count');

SELECT is(
    (SELECT entry_count FROM public.preview_report('2099-01-01', '2099-12-31')),
    0,
    'preview_report: returns 0 when no entries match period');

SELECT is(
    (SELECT entry_count FROM public.preview_report(
        '2026-01-01', '2026-01-31',
        NULL,
        'bbbbbbbb-0000-0000-0000-000000000099'::uuid)),
    0,
    'preview_report: category_id filter returns 0 for non-matching category');

-- ────────────────────────────────────────────────────────────────
-- generate_report
-- ────────────────────────────────────────────────────────────────

SELECT throws_ok(
    $$ SELECT public.generate_report('2099-01-01', '2099-12-31') $$,
    'P0001',
    NULL,
    'generate_report: raises when no entries match');

-- Call generate_report as Supervisor (auth.uid() already set via jwt.claims above)
SELECT ok(
    public.generate_report('2026-01-01', '2026-01-31') IS NOT NULL,
    'generate_report: returns a non-null report id');

SELECT is(
    (SELECT COUNT(*)::int FROM public.time_entries WHERE is_locked = true),
    3,
    'generate_report: locks all matched entries');

SELECT is(
    (SELECT time_entries_snapshot -> 0 ->> 'user_full_name' FROM public.reports LIMIT 1),
    'Test Supervisor',
    'generate_report: snapshot entries include user_full_name');

SELECT is(
    (SELECT time_entries_snapshot -> 0 ->> 'category_name' FROM public.reports LIMIT 1),
    'Admin',
    'generate_report: snapshot entries include category_name');

SELECT throws_ok(
    $$ SELECT public.generate_report('2026-01-01', '2026-01-31') $$,
    'P0001',
    NULL,
    'generate_report: raises when all matching entries already locked');

-- ────────────────────────────────────────────────────────────────
-- RLS — reports table
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pg_temp.as_role(p_role text) RETURNS void AS $$
BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config(
        'request.jwt.claims',
        json_build_object(
            'user_role', p_role,
            'sub', CASE p_role
                WHEN 'Supervisor' THEN '10000000-0000-0000-0000-000000000001'
                ELSE '20000000-0000-0000-0000-000000000002'
            END)::text,
        true);
END;
$$ LANGUAGE plpgsql;

-- Member: SELECT is silently filtered to 0 rows
SELECT pg_temp.as_role('Member');
SELECT is(
    (SELECT COUNT(*)::int FROM public.reports),
    0,
    'reports_select: Member gets 0 rows (RLS filtering)');

-- Member: direct INSERT denied
SELECT throws_ok(
    $$ INSERT INTO public.reports (generated_by, period_start, period_end)
       VALUES ('20000000-0000-0000-0000-000000000002',
               '2026-01-01', '2026-01-31') $$,
    '42501',
    NULL,
    'reports_insert: Member cannot INSERT');
RESET ROLE;

-- Supervisor: SELECT returns the generated report
SELECT pg_temp.as_role('Supervisor');
SELECT is(
    (SELECT COUNT(*)::int FROM public.reports),
    1,
    'reports_select: Supervisor can SELECT reports');
RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
