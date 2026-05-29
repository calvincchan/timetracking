-- =============================================================================
-- 001_initial_schema.sql — Enums, tables, indexes, functions, triggers
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('Supervisor', 'Member');
CREATE TYPE employment_type AS ENUM ('paid', 'volunteer');

-- Permission enum: resource:action format (read = list+show, write = create+edit, delete = delete)
CREATE TYPE permissions AS ENUM (
    'time_entries:read',
    'time_entries:write',
    'time_entries:delete',
    'time_entries:amend',
    'categories:read',
    'categories:write',
    'reports:read',
    'reports:write',
    'invites:write',
    'profiles:read'
);

-- 3. TABLES

-- Role-permission mapping: source of truth for frontend access control.
-- Used by accessControlProvider to load permissions per role.
CREATE TABLE public.role_permissions (
    role user_role NOT NULL,
    permission permissions NOT NULL,
    PRIMARY KEY (role, permission)
);

-- Seed role_permissions inline
-- Supervisor: all 10 permissions
INSERT INTO public.role_permissions (role, permission) VALUES
    ('Supervisor', 'time_entries:read'),
    ('Supervisor', 'time_entries:write'),
    ('Supervisor', 'time_entries:delete'),
    ('Supervisor', 'time_entries:amend'),
    ('Supervisor', 'categories:read'),
    ('Supervisor', 'categories:write'),
    ('Supervisor', 'reports:read'),
    ('Supervisor', 'reports:write'),
    ('Supervisor', 'invites:write'),
    ('Supervisor', 'profiles:read'),
-- Member: 4 permissions
    ('Member', 'time_entries:read'),
    ('Member', 'time_entries:write'),
    ('Member', 'time_entries:delete'),
    ('Member', 'categories:read');

-- Profiles: extends auth.users 1:1. Created by handle_new_user() trigger.
CREATE TABLE public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    full_name       TEXT NOT NULL DEFAULT '',
    role            user_role NOT NULL DEFAULT 'Member',
    employment_type employment_type NOT NULL DEFAULT 'volunteer',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Invites: the gatekeeper table for invite-only registration.
CREATE TABLE public.invites (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL UNIQUE,
    full_name  TEXT NOT NULL DEFAULT '',
    role       user_role NOT NULL DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories: time entry categories (e.g. admin, clinical, training).
CREATE TABLE public.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Time entries: core log of time spent by a user on a category.
CREATE TABLE public.time_entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entry_date       DATE NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    category_id      UUID NOT NULL REFERENCES public.categories(id),
    note             TEXT NOT NULL DEFAULT '',
    is_locked        BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX idx_time_entries_entry_date ON public.time_entries(entry_date);

-- Audit log: no FK on entry_id so the log survives entry deletion.
CREATE TABLE public.time_entry_audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id   UUID NOT NULL,
    action     TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data   JSONB NOT NULL DEFAULT '{}',
    new_data   JSONB NOT NULL DEFAULT '{}',
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entry_id ON public.time_entry_audit_logs(entry_id);

-- Reports: snapshot stored as JSONB array; typed in frontend as TimeEntrySnapshot[]
CREATE TABLE public.reports (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_by          UUID NOT NULL REFERENCES public.profiles(id),
    period_start          DATE NOT NULL,
    period_end            DATE NOT NULL,
    time_entries_snapshot JSONB NOT NULL DEFAULT '[]',
    generated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HELPER FUNCTIONS

-- has_role_permission: true if the current user's JWT role has the given permission.
-- STABLE SECURITY DEFINER — result cached per statement; bypasses RLS on role_permissions.
CREATE OR REPLACE FUNCTION public.has_role_permission(p_permission permissions)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.role_permissions
        WHERE role = (auth.jwt() ->> 'user_role')::user_role
          AND permission = p_permission
    );
END;
$$;

-- 5. FUNCTIONS

-- handle_new_user: first user → Supervisor; subsequent users must be invited.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user    BOOLEAN;
    invited_role     user_role;
    invited_full_name TEXT;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;

    IF is_first_user THEN
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (
            new.id,
            COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), new.email),
            'Supervisor'
        );
    ELSE
        SELECT role, full_name FROM public.invites
            WHERE email = new.email
            INTO invited_role, invited_full_name;

        IF invited_role IS NULL THEN
            RAISE EXCEPTION 'Registration rejected: Email not invited.';
        ELSE
            INSERT INTO public.profiles (id, full_name, role)
            VALUES (
                new.id,
                invited_full_name,
                invited_role
            );
            DELETE FROM public.invites WHERE email = new.email;
        END IF;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- custom_access_token_hook: injects user_role into JWT claims.
-- Register in Supabase dashboard: Authentication → Hooks → Custom Access Token.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(_event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    _claims    jsonb;
    _user_role user_role;
BEGIN
    SELECT COALESCE(
        (SELECT role FROM public.profiles WHERE id = (_event->>'user_id')::uuid),
        (SELECT role FROM public.invites  WHERE email = _event->'claims'->>'email')
    ) INTO _user_role;

    _claims := _event->'claims';

    IF _user_role IS NOT NULL THEN
        _claims := jsonb_set(_claims, '{user_role}', to_jsonb(_user_role::text));
    ELSE
        _claims := jsonb_set(_claims, '{user_role}', 'null');
    END IF;

    _event := jsonb_set(_event, '{claims}', _claims);
    RETURN _event;
END;
$$;

-- update_modified_column: auto-updates updated_at on any BEFORE UPDATE trigger.
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

CREATE TRIGGER update_categories_modtime
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

CREATE TRIGGER update_time_entries_modtime
    BEFORE UPDATE ON public.time_entries
    FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- log_time_entry_change: writes an audit row for every INSERT/UPDATE/DELETE on time_entries.
-- SECURITY DEFINER so it can bypass RLS to insert into time_entry_audit_logs.
CREATE OR REPLACE FUNCTION public.log_time_entry_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.time_entry_audit_logs (entry_id, action, old_data, new_data, changed_by)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN OLD IS NULL THEN '{}' ELSE to_jsonb(OLD) END,
        CASE WHEN NEW IS NULL THEN '{}' ELSE to_jsonb(NEW) END,
        auth.uid()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER time_entries_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.log_time_entry_change();

-- 6. GRANTS

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT SELECT ON public.time_entry_audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.reports TO authenticated;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
