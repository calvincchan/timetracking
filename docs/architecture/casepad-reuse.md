# Casepad Reuse Map

Files to copy from `../casepad/` and required deltas. Do not modify the Casepad source.

---

## Frontend Providers

| What | Source path | Delta required |
|---|---|---|
| OTP auth flow + profile cache | `casepad/frontend/src/providers/auth.ts` | Role names: `Owner`/`Receptionist`/`Provider` → `Supervisor`/`Member` |
| ACL singleton | `casepad/frontend/src/providers/access-control.ts` | Permission strings only — replace with strings from [roles-permissions.md](./roles-permissions.md) |
| Refine `AccessControlProvider` | `casepad/frontend/src/providers/access-control-provider.ts` | None |
| Supabase client init | `casepad/frontend/src/providers/supabase-client.ts` | None |
| Refine `DataProvider` | `casepad/frontend/src/providers/data.ts` | None |

---

## Supabase Migrations

| What | Source path | Delta required |
|---|---|---|
| `handle_new_user()` trigger | `casepad/supabase/migrations/20260307000001_initial_schema.sql` | `user_role` enum values (`Supervisor`/`Member` already match) |
| `has_role_permission()` fn | `casepad/supabase/migrations/20260307000002_rls.sql` | Update permission enum type to this app's strings |
| `custom_access_token_hook` | `casepad/supabase/migrations/20260307000002_rls.sql` | None — `user_role` claim key is identical |

---

## Claude Rules (copy verbatim)

| What | Source path |
|---|---|
| Refine v5 gotchas | `casepad/.claude/rules/frontend/refine-hooks.md` |
| Component patterns | `casepad/.claude/rules/frontend/component-patterns.md` |
| Supabase conventions | `casepad/.claude/rules/backend/supabase.md` |

Copy these into `.claude/rules/` in this project so agents working on this codebase inherit the same conventions.
