# Timetracking — Glossary

Term definitions only. No implementation details, SQL, or code.

---

**Member** — team user who logs their own hours (paid or volunteer); formerly called "User" in early design conversations.

**Supervisor** — team user who reads all hours, generates reports, manages categories, and sends invites.

**Time Entry** — a single duration record (in minutes) submitted by a Member for a given date and category.

**Category** — a Supervisor-managed label optionally applied to time entries (e.g. "Development", "Meetings"). Categories can be archived (hidden from the entry form) or unarchived. Time entries without a category are displayed as "Uncategorized".

**employment_type** — a profile attribute: either `paid` or `volunteer`; affects report grouping; hidden in v1 UI.

**Lock** — a state set on time entries when a report is generated; prevents Member edits and deletes via RLS.

**Amend** — a Supervisor-only override to update a locked time entry, controlled by the `time_entries:amend` permission.

**Report** — a Supervisor-generated accounting export for an arbitrary date range; stores an immutable JSONB snapshot of all included entries at generation time.

**Snapshot** — the immutable copy of time entry data stored inside `reports.time_entries_snapshot` at the moment a report is generated; typed as `TimeEntrySnapshot[]` in the frontend.

**Audit Log** — an append-only record of every INSERT, UPDATE, and DELETE on time entries, including Supervisor amends; survives entry deletion.

**Nudge** — an in-app banner shown to a Member when they have no entries for today and local time is 10:00 or later.

**Week** — the Sunday–Saturday period used in the Member weekly view.
