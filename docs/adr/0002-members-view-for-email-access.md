# ADR-0002: SECURITY DEFINER view for member roster with email

**Status:** Accepted

## Context

Supervisors need a read-only roster of all team members including their email address. Email lives exclusively in `auth.users`, which is owned by the `supabase_auth_admin` role and is inaccessible to the `authenticated` role via a normal query or RLS policy.

Three approaches were considered:

1. **SECURITY DEFINER view** — a view owned by `postgres` (the migration runner) that joins `auth.users` with `profiles`. The `WHERE has_role_permission('profiles:read')` clause restricts rows to callers who hold that permission, so Members see zero rows.

2. **SECURITY DEFINER RPC** — a PostgreSQL function that returns the same data. Slightly more flexible (can take parameters), but adds an extra abstraction layer and requires a custom data-provider hook in the frontend.

3. **Denormalize email into `profiles`** — copy email into the `profiles` table on signup (via the `handle_new_user` trigger). Simpler to query, but email in `auth.users` is the source of truth; a denormalized copy can drift and creates an update-path problem.

## Decision

Use a SECURITY DEFINER view (`public.members`) that joins `auth.users` and `profiles`, gated by `has_role_permission('profiles:read')`. This is the standard Supabase pattern for surfacing `auth.users` data to client queries.

The view reuses the existing `profiles:read` permission (Supervisor only) rather than adding a new `members:read` enum value. The frontend access-control provider maps the `members` resource to the `profiles` ACL key via `RESOURCE_ALIASES`.

## Consequences

- Email is always fresh — no denormalization drift.
- The view is read-only; no insert/update/delete surface exposed.
- Members querying `public.members` receive zero rows rather than an error, which is the expected behaviour for a row-security-style filter.
- The `RESOURCE_ALIASES` mapping in `access-control-provider.ts` must be kept in sync if the `members` resource is ever renamed.
- Future columns from `auth.users` (e.g. `last_sign_in_at`) can be added to the view without a new permission.
