# PRD-06: Audit Log & Amend

## Goal

Give Supervisors visibility into every change made to time entries (INSERT, UPDATE, DELETE) and the ability to amend locked entries when corrections are needed after a report has been generated.

---

## Scope

- Supervisor audit log view with filtering
- Supervisor amend of a locked entry
- Amend recorded in the audit log with before/after state

---

## User Stories

**US-01** As a Supervisor, I want to view a log of all changes to time entries so that I have a complete audit trail.

**US-02** As a Supervisor, I want to filter the audit log by entry, user, or date so that I can quickly find relevant history.

**US-03** As a Supervisor, I want to amend a locked time entry so that I can correct errors after a report has been generated.

**US-04** As a Supervisor, I want every amend to be recorded in the audit log with old and new values so that changes are fully traceable.

---

## Acceptance Criteria

### Audit log view (US-01)

- [ ] Supervisor can navigate to an audit log page
- [ ] Log shows all rows from `time_entry_audit_logs`, newest first
- [ ] Each row displays: timestamp, action (INSERT / UPDATE / DELETE), entry ID, changed by (Supervisor or Member full name), old values, new values
- [ ] Old/new values rendered as a readable diff or structured list (not raw JSON)

### Filtering (US-02)

- [ ] Filter controls: entry ID (text), user (dropdown of profiles), date range (start + end)
- [ ] Filters are combinable
- [ ] Filter state persists across page navigations within the session
- [ ] Clearing filters restores the full log

### Amend locked entry (US-03)

- [ ] Supervisor can locate a locked entry (via audit log or a dedicated locked-entries view)
- [ ] Amend action opens an edit form pre-filled with current values
- [ ] RLS permits the UPDATE because `has_role_permission('time_entries:amend')` is true
- [ ] Form fields available: `duration_minutes`, `category_id`, `note`, `entry_date`
- [ ] `is_locked` remains `true` after amend (amend does not unlock)
- [ ] On save, `time_entries.updated_at` is updated

### Amend audit record (US-04)

- [ ] The `time_entries_audit` trigger fires automatically on UPDATE
- [ ] Resulting `time_entry_audit_logs` row has `action = 'UPDATE'`, correct `old_data`, `new_data`, and `changed_by = auth.uid()` of the Supervisor
- [ ] Amend is visible in the audit log view immediately

---

## Schema / API Notes

- Table: `time_entry_audit_logs` (`entry_id` has no FK — survives entry deletion) — see [schema.md](../architecture/schema.md)
- Trigger: `time_entries_audit` (AFTER INSERT/UPDATE/DELETE) fires automatically — no app-layer call — see [schema.md](../architecture/schema.md)
- Amend permission: `time_entries:amend` (Supervisor only) — see [roles-permissions.md](../architecture/roles-permissions.md)
- Audit log query: `SELECT * FROM time_entry_audit_logs ORDER BY changed_at DESC`
- Join `changed_by` → `profiles.full_name` for display

---

## Out of Scope

- Member access to audit log
- Reverting to a previous state from the audit log (amend only — no one-click revert)
- Audit log for tables other than `time_entries`
- Audit log export
