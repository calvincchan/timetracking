# Architecture Overview

See [CONTEXT.md](../../CONTEXT.md) for term definitions.

---

## Stack

| Layer | Technology |
|---|---|
| Hosting | Vercel |
| Framework | Next.js (App Router) |
| UI | Refine.js v5 + shadcn/ui + Tailwind v4 |
| Backend | Supabase (Postgres + Auth + RLS) |
| Auth | OTP magic link (email) |

---

## Roles

| Role | Summary |
|---|---|
| **Supervisor** | Reads all hours; generates reports; manages categories and invites; can amend locked entries |
| **Member** | Logs own hours; views own weekly summary; cannot modify locked entries |

---

## Design Decisions

| # | Decision | Detail |
|---|---|---|
| 1 | Time entry model | Duration-only (`duration_minutes INT`); no start/end timestamps |
| 2 | Categories | Supervisor-managed table; required FK on every entry |
| 3 | Approval workflow | None — `is_locked` boolean set at report generation |
| 4 | Edit/delete rules | Open on unlocked entries; locked entries blocked by RLS; Supervisor uses `time_entries:amend` — see [roles-permissions.md](./roles-permissions.md) |
| 5 | Report format | CSV only; arbitrary date range; per-user/per-category; summary + detail — see [flows.md](./flows.md) |
| 6 | Weekly view | List layout; Sun–Sat week picker; daily + weekly totals; no overtime |
| 7 | Notifications | In-app nudge if no entries today and local time ≥ 10:00 |
| 8 | Invite flow | Invite-only; copies Casepad pattern — see [flows.md](./flows.md) |
| 9 | Timezone | `entry_date date` only; single-timezone org assumption |
| 10 | Mobile | Responsive web; no PWA |

---

## Sub-documents

| File | Contents |
|---|---|
| [schema.md](./schema.md) | Full SQL (types, tables, audit trigger) + frontend `TimeEntrySnapshot` TypeScript type |
| [roles-permissions.md](./roles-permissions.md) | RBAC permission strings, JWT claim setup, RLS key rules |
| [flows.md](./flows.md) | Step-by-step: report generation, invite flow, member login, Supervisor amend |
| [casepad-reuse.md](./casepad-reuse.md) | Reuse map: which Casepad files to copy and what to change |

---

## PRD Index

| File | Feature area |
|---|---|
| [prd-01-auth-invite.md](../prd/prd-01-auth-invite.md) | OTP login, invite creation, first-time profile setup |
| [prd-02-categories.md](../prd/prd-02-categories.md) | Category CRUD and archiving |
| [prd-03-time-entries.md](../prd/prd-03-time-entries.md) | Logging, editing, deleting entries; nudge; locked state |
| [prd-04-weekly-view.md](../prd/prd-04-weekly-view.md) | Week picker, daily totals, weekly grand total |
| [prd-05-reports.md](../prd/prd-05-reports.md) | Report generation, CSV download, snapshot storage |
| [prd-06-audit.md](../prd/prd-06-audit.md) | Audit log view, Supervisor amend |
