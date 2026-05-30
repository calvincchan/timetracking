---
globs: supabase/**
---

# Supabase Backend Rules

## Tables

profiles, invites, categories, time_entries, time_entry_audit_logs, reports

## Role System (`user_role` enum)

- `Supervisor` — full access including user management, amending locked entries, and viewing all members' time
- `Member` — own time entries only; read/write/delete own; read categories

## RLS

**JWT role claim**: `auth.jwt() ->> 'user_role'` — never JOIN to `profiles` inside policies; use `auth.uid()` for identity.

**Helper functions**:
- `has_role_permission(p_permission permissions)` — STABLE SECURITY DEFINER; checks role_permissions table

## Schema Conventions

**Zero-null**: all string/JSONB columns are `NOT NULL DEFAULT ''` / `DEFAULT '{}'` — never nullable.

**PKs**: `uuid` with `gen_random_uuid()` default; include `created_at`/`updated_at` where appropriate.

**Never DROP or TRUNCATE** without explicit user confirmation.

## Migration Commands

Filename: `YYYYMMDDHHMMSS_<description>.sql` — get timestamp with `date -u +%Y%m%d%H%M%S`

Apply:
```bash
npx -y supabase migration up --local
```

Reset from scratch:
```bash
npx -y supabase db reset --local
```

Query local DB:
```bash
echo "<sql>" | npx -y supabase db query --local
```

## After Every Migration

**Always run `bash db-refresh.sh` immediately after applying any schema change or migration.**

This regenerates:
- `supabase/schema.sql` — schema dump
- `frontend/src/types/database.ts` — TypeScript types

Never skip this step. Stale types cause silent type errors that are hard to trace.
Apply migrations first (`npx supabase migration up --local`), then run `bash db-refresh.sh`.

## pgTAP Tests

DB-level behaviour (triggers, RLS policies, helper functions) is tested with pgTAP.
Test files live in `supabase/tests/*.sql`. Use `BEGIN`/`ROLLBACK` for isolation.

**Run before every commit that touches `supabase/`:**
```bash
# All tests
npx supabase test db --local

# Single file
npx supabase test db --local supabase/tests/<test_file>.sql
```

Output must end with `Result: PASS`. Do not commit if any test fails.

**Adding tests:** when a migration changes a trigger, RLS policy, or SECURITY DEFINER
function, add or update the corresponding test in `supabase/tests/`.
