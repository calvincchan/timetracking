# PRD-01: Auth & Invite

## Goal

Allow team members to log in via OTP magic link and Supervisors to invite new users. Every user account must be created through an explicit invite — no self-registration.

---

## Scope

- OTP login for Members and Supervisors
- Invite creation by Supervisors
- Automatic profile creation on first login (via DB trigger)

---

## User Stories

**US-01** As a Member, I want to log in with my email address so that I can access my time entries without a password.

**US-02** As a Supervisor, I want to invite a new team member by email and role so that only authorised people can access the app.

**US-03** As an invited Member, I want to receive a magic link by email so that I can create my account on first login.

**US-04** As a new user clicking a magic link, I want my profile to be created automatically with my assigned role so that I can start using the app immediately.

---

## Acceptance Criteria

### Login (US-01)

- [ ] Login page has an email field and a "Send code" button
- [ ] Submitting a valid email sends an OTP to that address and shows a code-entry step
- [ ] Entering a correct OTP logs the user in and redirects to their home page
- [ ] Entering an incorrect or expired OTP shows a clear error message
- [ ] Emails not in `profiles` (no invite, no account) cannot log in

### Invite (US-02)

- [ ] Supervisor can access an "Invite" form with fields: email, full name, role
- [ ] Submitting creates a row in the `invites` table
- [ ] Supabase sends an OTP magic link to the invited email
- [ ] Inviting an already-registered email shows a validation error
- [ ] Invite list shows pending invites (email + role + created date)

### First-time login (US-03 / US-04)

- [ ] Clicking the magic link verifies the OTP and completes sign-in
- [ ] `handle_new_user()` trigger fires, creates a `profiles` row with `role` and `full_name` from the `invites` table
- [ ] Invite row is deleted after profile creation
- [ ] User is redirected to their home page with correct role-based navigation

---

## Schema / API Notes

- Auth: `supabaseClient.auth.signInWithOtp({ email })` → `supabaseClient.auth.verifyOtp({ email, token, type: 'email' })`
- Invite storage: `invites` table (see [schema.md](../architecture/schema.md))
- Profile auto-creation: `handle_new_user()` trigger on `auth.users` INSERT (copy from Casepad — see [casepad-reuse.md](../architecture/casepad-reuse.md))
- JWT role claim: injected by `custom_access_token_hook`; read on the frontend as `user_role`

---

## Out of Scope

- Self-registration (invite-only)
- Password-based auth
- OAuth / SSO
- Email/role editing after invite creation (cancel + re-invite instead)
- `employment_type` field in the invite form (set post-signup by Supervisor)
