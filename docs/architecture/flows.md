# Key Flows

---

## Report Generation

1. Supervisor selects a date range → UI shows a preview entry count (SELECT COUNT before committing).
2. Supervisor confirms → a server action executes in a transaction:
   a. SELECT all unlocked `time_entries` where `entry_date` is within the range.
   b. INSERT a `reports` row with `time_entries_snapshot` set to the JSONB array of those entries.
   c. UPDATE `time_entries SET is_locked = TRUE` for the same IDs.
3. Server streams a CSV file to the client.

CSV structure: one summary block (totals per user per category) followed by detail rows (one per entry). Filtered by user and/or category as requested.

---

## Invite Flow

1. Supervisor submits an email address and role → INSERT into `invites` table.
2. Supabase sends an OTP magic link to that email address.
3. Member clicks the link → OTP is verified by Supabase Auth.
4. A `handle_new_user()` database trigger fires on INSERT into `auth.users`:
   - Looks up the new user's email in the `invites` table.
   - Creates a `profiles` row with the `role` and `full_name` from the matching invite.
   - Deletes the invite row.

If no matching invite is found, the trigger creates a default `Member` profile (safety fallback).

---

## Member Login

1. Member enters their email → `supabaseClient.auth.signInWithOtp({ email })`.
2. Member enters the OTP from email → `supabaseClient.auth.verifyOtp({ email, token, type: 'email' })`.
3. JWT returned → frontend reads the `user_role` claim → ACL singleton loaded → profile cached in context.

---

## Amend Flow (Supervisor)

1. Supervisor locates a locked entry in the audit view.
2. Supervisor edits the entry → RLS checks `has_role_permission('time_entries:amend')` (bypasses `is_locked` guard).
3. The `time_entries_audit` trigger fires AFTER UPDATE → writes a row to `time_entry_audit_logs` with `old_data` and `new_data` snapshots and `changed_by = auth.uid()`.
