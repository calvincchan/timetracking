-- =============================================================================
-- 002_rls.sql — Row Level Security policies
-- =============================================================================

-- 1. ENABLE RLS ON ALL TABLES
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entry_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 2. ROLE PERMISSIONS
-- All authenticated users can read (used by accessControlProvider on login).
-- INSERT/UPDATE/DELETE blocked — seeded by migration, never modified by app users.
CREATE POLICY "role_permissions_read"
ON public.role_permissions FOR SELECT TO authenticated
USING (true);

-- 3. PROFILES
-- Own profile always readable; Supervisors read all via profiles:read permission.
CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role_permission('profiles:read'));

-- Own profile only (no INSERT — trigger handles it).
CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

-- 4. INVITES
-- Single ALL policy — only invites:write is defined.
CREATE POLICY "invites_all"
ON public.invites FOR ALL TO authenticated
USING (public.has_role_permission('invites:write'))
WITH CHECK (public.has_role_permission('invites:write'));

-- 5. CATEGORIES
CREATE POLICY "categories_select"
ON public.categories FOR SELECT TO authenticated
USING (public.has_role_permission('categories:read'));

CREATE POLICY "categories_insert"
ON public.categories FOR INSERT TO authenticated
WITH CHECK (public.has_role_permission('categories:write'));

CREATE POLICY "categories_update"
ON public.categories FOR UPDATE TO authenticated
USING (public.has_role_permission('categories:write'));

-- No DELETE policy — no categories:delete permission defined; deny by default.

-- 6. TIME ENTRIES

-- SELECT: Supervisors see all; Members see own.
CREATE POLICY "time_entries_select"
ON public.time_entries FOR SELECT TO authenticated
USING (
    public.has_role_permission('time_entries:read')
    AND ((auth.jwt() ->> 'user_role') = 'Supervisor' OR user_id = auth.uid())
);

-- INSERT: gated by write permission; user_id set by caller.
CREATE POLICY "time_entries_insert"
ON public.time_entries FOR INSERT TO authenticated
WITH CHECK (public.has_role_permission('time_entries:write'));

-- UPDATE amend: Supervisor override (bypasses lock check).
CREATE POLICY "time_entries_update_amend"
ON public.time_entries FOR UPDATE TO authenticated
USING (public.has_role_permission('time_entries:amend'));

-- UPDATE write: own unlocked entries (Members and Supervisors for own).
CREATE POLICY "time_entries_update_write"
ON public.time_entries FOR UPDATE TO authenticated
USING (
    public.has_role_permission('time_entries:write')
    AND user_id = auth.uid()
    AND NOT is_locked
);

-- DELETE: own entries; Members blocked on locked, Supervisors not.
CREATE POLICY "time_entries_delete"
ON public.time_entries FOR DELETE TO authenticated
USING (
    public.has_role_permission('time_entries:delete')
    AND user_id = auth.uid()
    AND ((auth.jwt() ->> 'user_role') = 'Supervisor' OR NOT is_locked)
);

-- 7. TIME ENTRY AUDIT LOGS
-- SELECT only for Supervisors; INSERT is handled by SECURITY DEFINER trigger (no user INSERT policy).
CREATE POLICY "audit_logs_select"
ON public.time_entry_audit_logs FOR SELECT TO authenticated
USING (
    public.has_role_permission('time_entries:read')
    AND (auth.jwt() ->> 'user_role') = 'Supervisor'
);

-- 8. REPORTS
CREATE POLICY "reports_select"
ON public.reports FOR SELECT TO authenticated
USING (public.has_role_permission('reports:read'));

CREATE POLICY "reports_insert"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (public.has_role_permission('reports:write'));
