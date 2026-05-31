BEGIN;

SELECT plan(12);

-- ────────────────────────────────────────────────────────────────
-- Schema-shape assertions (run as superuser, before RLS simulation)
-- ────────────────────────────────────────────────────────────────
SELECT col_not_null('categories', 'created_at',
    'categories.created_at is NOT NULL');
SELECT col_not_null('categories', 'updated_at',
    'categories.updated_at is NOT NULL');
SELECT col_is_null('time_entries', 'category_id',
    'time_entries.category_id is nullable');
SELECT has_index('public', 'categories', 'categories_name_active_unique',
    'partial unique index on categories.name exists');

-- ────────────────────────────────────────────────────────────────
-- Partial unique constraint behaviour
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.categories (name, is_archived) VALUES ('Coding', false);

-- Duplicate active name → fails
SELECT throws_ok(
    $$ INSERT INTO public.categories (name, is_archived) VALUES ('Coding', false) $$,
    '23505',
    NULL,
    'duplicate active category name is rejected'
);

-- Name matching an archived category → succeeds
INSERT INTO public.categories (name, is_archived) VALUES ('Legacy', true);
SELECT lives_ok(
    $$ INSERT INTO public.categories (name, is_archived) VALUES ('Legacy', false) $$,
    'name matching an archived category is accepted'
);

-- ────────────────────────────────────────────────────────────────
-- RLS policy simulation
-- Helpers to switch into a role-bearing authenticated session.
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
    $$ SELECT 1 FROM public.categories $$,
    'categories_select: Supervisor can SELECT');

-- Supervisor: INSERT allowed
SELECT lives_ok(
    $$ INSERT INTO public.categories (name) VALUES ('Supervisor Insert') $$,
    'categories_insert: Supervisor can INSERT');

-- Supervisor: UPDATE allowed
SELECT lives_ok(
    $$ UPDATE public.categories SET name = 'Renamed' WHERE name = 'Supervisor Insert' $$,
    'categories_update: Supervisor can UPDATE');

RESET ROLE;

-- Member: SELECT allowed
SELECT pg_temp.as_role('Member');
SELECT lives_ok(
    $$ SELECT 1 FROM public.categories $$,
    'categories_select: Member can SELECT');

-- Member: INSERT denied
SELECT throws_ok(
    $$ INSERT INTO public.categories (name) VALUES ('Member Insert') $$,
    '42501',
    NULL,
    'categories_insert: Member cannot INSERT');

-- Member: UPDATE denied — USING clause filters all rows, so the row is
-- left unchanged (no error, zero rows affected).
UPDATE public.categories SET name = 'Hacked' WHERE name = 'Coding';

RESET ROLE;

SELECT is(
    (SELECT COUNT(*)::int FROM public.categories WHERE name = 'Coding'),
    1,
    'categories_update: Member UPDATE leaves row unchanged');

SELECT * FROM finish();

ROLLBACK;
