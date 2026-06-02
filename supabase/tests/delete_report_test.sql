BEGIN;

SELECT plan(5);

-- ────────────────────────────────────────────────────────────────
-- Setup: users, profiles, categories, time entries
-- ────────────────────────────────────────────────────────────────
SET LOCAL session_replication_role = replica;

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
    ('10000000-0000-0000-0000-000000000011', 'pgtap-del-supervisor@localhost', '{}'),
    ('20000000-0000-0000-0000-000000000022', 'pgtap-del-member@localhost',     '{}');

INSERT INTO public.profiles (id, full_name, role, employment_type)
VALUES
    ('10000000-0000-0000-0000-000000000011', 'Del Supervisor', 'Supervisor', 'paid'),
    ('20000000-0000-0000-0000-000000000022', 'Del Member',     'Member',     'volunteer');

SET LOCAL session_replication_role = DEFAULT;

INSERT INTO public.categories (id, name)
VALUES ('bbbbbbbb-0000-0000-0000-000000000002', 'Testing');

SELECT set_config(
    'request.jwt.claims',
    '{"sub": "10000000-0000-0000-0000-000000000011", "user_role": "Supervisor"}',
    true);

INSERT INTO public.time_entries (id, user_id, entry_date, duration_minutes, category_id, note)
VALUES
    ('f1000000-0000-0000-0000-000000000001',
     '10000000-0000-0000-0000-000000000011', '2026-02-10', 60,
     'bbbbbbbb-0000-0000-0000-000000000002', 'Del Entry 1'),
    ('f2000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000011', '2026-02-15', 90,
     'bbbbbbbb-0000-0000-0000-000000000002', 'Del Entry 2'),
    ('f3000000-0000-0000-0000-000000000003',
     '20000000-0000-0000-0000-000000000022', '2026-02-20', 45,
     'bbbbbbbb-0000-0000-0000-000000000002', 'Del Entry 3');

-- Generate a report (locks all 3 entries)
SELECT public.generate_report('2026-02-01', '2026-02-28');

-- Capture the report id for later use
CREATE TEMP TABLE _del_report AS
    SELECT id FROM public.reports
    WHERE period_start = '2026-02-01' AND period_end = '2026-02-28'
    LIMIT 1;

-- ────────────────────────────────────────────────────────────────
-- Member cannot call delete_report
-- ────────────────────────────────────────────────────────────────
SELECT set_config(
    'request.jwt.claims',
    '{"sub": "20000000-0000-0000-0000-000000000022", "user_role": "Member"}',
    true);

SELECT throws_ok(
    format($$ SELECT public.delete_report(%L::uuid) $$,
           (SELECT id FROM _del_report)),
    'P0001',
    NULL,
    'delete_report: Member cannot call RPC');

-- ────────────────────────────────────────────────────────────────
-- Supervisor can call delete_report
-- ────────────────────────────────────────────────────────────────
SELECT set_config(
    'request.jwt.claims',
    '{"sub": "10000000-0000-0000-0000-000000000011", "user_role": "Supervisor"}',
    true);

SELECT lives_ok(
    format($$ SELECT public.delete_report(%L::uuid) $$,
           (SELECT id FROM _del_report)),
    'delete_report: Supervisor can call RPC');

SELECT is(
    (SELECT COUNT(*)::int FROM public.time_entries
     WHERE id IN (
         'f1000000-0000-0000-0000-000000000001',
         'f2000000-0000-0000-0000-000000000002',
         'f3000000-0000-0000-0000-000000000003'
     ) AND is_locked = false),
    3,
    'delete_report: all 3 entries are unlocked after deletion');

SELECT is(
    (SELECT COUNT(*)::int FROM public.reports
     WHERE id = (SELECT id FROM _del_report)),
    0,
    'delete_report: report row is deleted');

SELECT throws_ok(
    format($$ SELECT public.delete_report(%L::uuid) $$,
           (SELECT id FROM _del_report)),
    'P0001',
    'delete_report: report not found',
    'delete_report: raises error when report not found');

SELECT * FROM finish();

ROLLBACK;
