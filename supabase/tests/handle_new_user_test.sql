BEGIN;

SELECT plan(9);

-- Clean slate within this transaction
DELETE FROM public.profiles;
DELETE FROM public.invites;

-- ────────────────────────────────────────────────────────────────
-- 1. First-user path: Supervisor profile created immediately on INSERT
--    (email_confirmed_at intentionally NULL — profile must exist anyway)
-- ────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'supervisor@example.com',
    '{"full_name": "Alice Admin"}'
);

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.profiles
         WHERE id    = '10000000-0000-0000-0000-000000000001'
           AND role  = 'Supervisor'
    ),
    'first user: Supervisor profile created on INSERT'
);

-- ────────────────────────────────────────────────────────────────
-- 2–3. Invited user INSERT (unconfirmed) → invite survives, no profile
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.invites (email, full_name, role)
VALUES ('member@example.com', 'Bob Builder', 'Member');

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
    '10000000-0000-0000-0000-000000000002',
    'member@example.com',
    '{}'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1 FROM public.profiles
         WHERE id = '10000000-0000-0000-0000-000000000002'
    ),
    'invited user: no profile on unconfirmed INSERT'
);

SELECT ok(
    EXISTS (SELECT 1 FROM public.invites WHERE email = 'member@example.com'),
    'invited user: invite row survives unconfirmed INSERT'
);

-- ────────────────────────────────────────────────────────────────
-- 4–7. Confirmation UPDATE (email_confirmed_at NULL → NOT NULL)
--      → profile created with correct data, invite deleted
-- ────────────────────────────────────────────────────────────────
UPDATE auth.users
   SET email_confirmed_at = NOW()
 WHERE id = '10000000-0000-0000-0000-000000000002';

SELECT ok(
    EXISTS (
        SELECT 1 FROM public.profiles
         WHERE id = '10000000-0000-0000-0000-000000000002'
    ),
    'invited user: profile created after confirmation'
);

SELECT is(
    (SELECT full_name FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000002'),
    'Bob Builder',
    'invited user: profile full_name from invite'
);

SELECT is(
    (SELECT role::text FROM public.profiles WHERE id = '10000000-0000-0000-0000-000000000002'),
    'Member',
    'invited user: profile role from invite'
);

SELECT ok(
    NOT EXISTS (SELECT 1 FROM public.invites WHERE email = 'member@example.com'),
    'invited user: invite deleted after confirmation'
);

-- ────────────────────────────────────────────────────────────────
-- 8. Uninvited email INSERT → raises exception
-- ────────────────────────────────────────────────────────────────
SELECT throws_ok(
    $$ INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES ('10000000-0000-0000-0000-000000000003', 'nope@example.com', '{}') $$,
    'P0001',
    'Registration rejected: Email not invited.',
    'uninvited email: INSERT raises exception'
);

-- ────────────────────────────────────────────────────────────────
-- 9. Subsequent UPDATE on already-confirmed user → no duplicate profile
-- ────────────────────────────────────────────────────────────────
UPDATE auth.users
   SET updated_at = NOW()
 WHERE id = '10000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT COUNT(*)::int FROM public.profiles
      WHERE id = '10000000-0000-0000-0000-000000000002'),
    1,
    'invited user: no duplicate profile on subsequent UPDATE'
);

SELECT * FROM finish();

ROLLBACK;
