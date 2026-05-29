# PRD-02: Categories

## Goal

Give Supervisors full control over the category list that Members use when logging time. Categories can be archived to stop them appearing in the entry form without deleting historical data.

---

## Scope

- Category creation
- Category renaming
- Category archiving (soft delete)
- Category list management UI (Supervisor only)
- Category dropdown in entry form (Members — read-only)

---

## User Stories

**US-01** As a Supervisor, I want to create a new category so that Members can log time against it.

**US-02** As a Supervisor, I want to rename an existing category so that the label stays accurate as the team's work evolves.

**US-03** As a Supervisor, I want to archive a category so that it no longer appears in the entry form while preserving all historical entries that used it.

**US-04** As a Member, I want to select a category when logging time so that my hours are properly classified.

---

## Acceptance Criteria

### Create (US-01)

- [ ] Supervisor can open a "New category" form with a name field
- [ ] Submitting with a non-empty name creates a row in `categories` and shows it in the list immediately
- [ ] Submitting with an empty name shows a validation error
- [ ] Duplicate names are allowed (no unique constraint enforced in v1)

### Rename (US-02)

- [ ] Each category row has an edit action
- [ ] Saving an edited name updates `categories.name` and `updated_at`
- [ ] Saving an empty name shows a validation error

### Archive (US-03)

- [ ] Each non-archived category row has an "Archive" action
- [ ] Confirming archive sets `categories.is_archived = true`
- [ ] Archived categories do not appear in the Member entry form dropdown
- [ ] Archived categories remain visible in the Supervisor category list (filterable)
- [ ] Existing time entries that reference an archived category are unaffected
- [ ] Archived categories cannot be selected for new entries

### Member dropdown (US-04)

- [ ] Entry form category dropdown shows only non-archived categories
- [ ] Dropdown is sorted alphabetically
- [ ] Selecting a category is required — form cannot be submitted without one

---

## Schema / API Notes

- Table: `categories` (`id`, `name`, `is_archived`, `created_at`, `updated_at`) — see [schema.md](../architecture/schema.md)
- Permissions: `categories:read` (Member + Supervisor); `categories:write` (Supervisor only) — see [roles-permissions.md](../architecture/roles-permissions.md)
- Filter for entry form: `WHERE is_archived = false ORDER BY name`

---

## Out of Scope

- Hard delete of categories
- Category ordering / drag-and-drop
- Per-category access restrictions (all Members see all categories)
- Category descriptions or metadata
