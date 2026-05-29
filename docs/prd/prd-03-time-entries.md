# PRD-03: Time Entries

## Goal

Allow Members to log, edit, and delete their own time entries. Entries are duration-only (minutes). Locked entries — set when a report is generated — cannot be modified by Members.

---

## Scope

- Log a new time entry
- Edit an unlocked entry
- Delete an unlocked entry
- In-app nudge when no entries logged today (time ≥ 10:00)
- Locked entry display (read-only, no edit/delete controls)

---

## User Stories

**US-01** As a Member, I want to log hours for a given date, duration, and category so that my work is recorded.

**US-02** As a Member, I want to edit an unlocked entry so that I can correct mistakes.

**US-03** As a Member, I want to delete an unlocked entry so that I can remove an entry logged in error.

**US-04** As a Member, I want to see a nudge when I haven't logged any time today so that I don't forget to submit hours.

**US-05** As a Member, I want to see clearly that a locked entry cannot be edited so that I understand why edit controls are absent.

---

## Acceptance Criteria

### Log entry (US-01)

- [ ] Entry form has fields: date (defaults to today), duration in minutes, category (dropdown), note (optional)
- [ ] Duration must be a positive integer — form validation rejects zero or negative values
- [ ] Category is required — form cannot be submitted without one
- [ ] Submitting creates a row in `time_entries` with `is_locked = false`
- [ ] New entry appears in the current week view immediately

### Edit entry (US-02)

- [ ] Unlocked entries show an edit action
- [ ] Editing opens the same form pre-filled with existing values
- [ ] Saving updates `duration_minutes`, `category_id`, `note`, `entry_date`, and `updated_at`
- [ ] No fields are required to change — saving with identical values is allowed
- [ ] Locked entries do not show an edit action

### Delete entry (US-03)

- [ ] Unlocked entries show a delete action
- [ ] Deleting prompts a confirmation before removing the row
- [ ] Confirming removes the entry from `time_entries`
- [ ] Locked entries do not show a delete action

### Nudge (US-04)

- [ ] A banner is shown when: (a) no `time_entries` exist for today for the current user, AND (b) local time ≥ 10:00
- [ ] Banner is dismissible for the current browser session (does not re-appear until next page load after 10:00 with no entries)
- [ ] Banner is not shown before 10:00 local time
- [ ] Banner disappears immediately when the first entry for today is saved

### Locked entry display (US-05)

- [ ] Locked entries are visually distinct (e.g. a lock icon or muted style)
- [ ] No edit or delete controls are rendered for locked entries
- [ ] A tooltip or label explains the entry is locked

---

## Schema / API Notes

- Table: `time_entries` — see [schema.md](../architecture/schema.md)
- RLS: UPDATE/DELETE blocked when `is_locked = true` for Members — see [roles-permissions.md](../architecture/roles-permissions.md)
- Audit trigger fires on every INSERT/UPDATE/DELETE automatically — no application-layer call needed
- Nudge check: client-side, reads today's entries from the data layer; evaluates `new Date()` for local time ≥ 10:00

---

## Out of Scope

- Bulk entry logging
- Timer / start-stop time tracking
- Entry approval workflow
- Member viewing other Members' entries
- `employment_type` field on the entry form
