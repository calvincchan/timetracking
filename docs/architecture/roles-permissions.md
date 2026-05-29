# Roles & Permissions

---

## Role Enum

```sql
CREATE TYPE user_role AS ENUM ('Supervisor', 'Member');
```

---

## Permission Strings

| Permission | Supervisor | Member | Notes |
|---|---|---|---|
| `time_entries:read` | All users' entries | Own entries only | |
| `time_entries:write` | Own entries | Own unlocked entries only | |
| `time_entries:delete` | Own entries | Own unlocked entries only | |
| `time_entries:amend` | Any locked entry | — | Supervisor-only override |
| `categories:read` | ✓ | ✓ | Used in entry form dropdown |
| `categories:write` | ✓ (create / archive) | — | |
| `reports:read` | ✓ | — | |
| `reports:write` | ✓ (generate + lock entries) | — | |
| `invites:write` | ✓ | — | |
| `profiles:read` | All profiles | — | |

---

## JWT Claim Setup

The `user_role` claim is injected via a `custom_access_token_hook` in Supabase Auth. The hook reads `profiles.role` for the authenticated user and adds it to the JWT under the key `user_role`.

Copy the hook implementation verbatim from:
`casepad/supabase/migrations/20260307000002_rls.sql`

The claim key (`user_role`) is identical between Casepad and this app — no changes needed.

---

## `has_role_permission()` Function

```sql
-- Signature (implementation lives in the RLS migration)
has_role_permission(permission text) RETURNS boolean
```

Returns `true` if the calling user's JWT claim `user_role` grants the requested permission string. All RLS policies check this function first (deny-by-default).

Copy the implementation from:
`casepad/supabase/migrations/20260307000002_rls.sql`

Update only the permission enum type to match this app's permission strings listed above.

---

## RLS Key Rules

### Members

- **SELECT** `time_entries`: `WHERE user_id = auth.uid()`
- **UPDATE** `time_entries`: `WHERE user_id = auth.uid() AND NOT is_locked`
- **DELETE** `time_entries`: `WHERE user_id = auth.uid() AND NOT is_locked`

### Supervisors

- **SELECT** `time_entries`: all rows (no `user_id` filter)
- **UPDATE** locked entries: allowed when `has_role_permission('time_entries:amend')` — bypasses the `is_locked` check
- **SELECT** `profiles`: all rows

### General

- All policies check `has_role_permission(<permission>)` before the row-level filter.
- Tables not listed above (e.g. `reports`, `invites`, `categories`) follow standard `has_role_permission` checks without row-level user filtering.
