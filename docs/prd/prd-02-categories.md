# PRD-02: Categories

## Goal

Give Supervisors full control over the category list that Members use when logging time. Categories can be archived or unarchived. Category selection on time entries is optional; entries without one display as "Uncategorized".

---

## Scope

- Category creation
- Category renaming
- Category archiving / unarchiving (soft delete)
- Category list management UI (Supervisor only)
- Category dropdown in entry form (Members — optional)

---

## User Stories

**US-01** As a Supervisor, I want to create a new category so that Members can log time against it.

**US-02** As a Supervisor, I want to rename an existing category so that the label stays accurate as the team's work evolves.

**US-03** As a Supervisor, I want to archive a category so that it no longer appears in the entry form while preserving all historical entries that used it.

**US-04** As a Member, I want to optionally select a category when logging time so that my hours can be classified.

**US-05** As a Supervisor, I want to unarchive a category so that it becomes available again for Members to select.

---

## Acceptance Criteria

### Create (US-01)

- [ ] Supervisor can open a "New category" form with a name field
- [ ] Submitting with a non-empty name creates a row in `categories` and shows it in the list immediately
- [ ] Submitting with an empty name shows a validation error
- [ ] Submitting a name that already exists among active (non-archived) categories shows a validation error — duplicate active names are not allowed
- [ ] A name previously used by an archived category may be reused for a new active category

### Rename (US-02)

- [ ] Each category row has an edit action
- [ ] Saving an edited name updates `categories.name` and `updated_at`
- [ ] Saving an empty name shows a validation error
- [ ] Saving a name already used by another active category shows a validation error
- [ ] Rename propagates to all historical time entries (entries reference the category by ID, so the new name appears everywhere the category was used)

### Archive (US-03)

- [ ] Each non-archived category row has an "Archive" action
- [ ] A simple confirmation dialog is shown before archiving ("Archive 'X'? It will no longer appear in the entry form.")
- [ ] Confirming archive sets `categories.is_archived = true`
- [ ] Archived categories do not appear in the Member entry form dropdown
- [ ] Archived categories remain visible in the Supervisor category list when "Show archived" is toggled on
- [ ] The Supervisor list shows active categories by default; a "Show archived" toggle reveals archived ones
- [ ] Existing time entries that reference an archived category are unaffected
- [ ] Archived categories cannot be selected for new entries

### Unarchive (US-05)

- [ ] Each archived category row in the Supervisor list has an "Unarchive" action
- [ ] Unarchiving sets `categories.is_archived = false` and the category immediately reappears in the entry form dropdown
- [ ] If an active category with the same name already exists, the unarchive action is blocked with an error

### Member dropdown (US-04)

- [ ] Entry form category dropdown shows only non-archived categories
- [ ] Dropdown is sorted alphabetically
- [ ] Category selection is optional — form can be submitted without one
- [ ] When no active categories exist, the dropdown shows a disabled empty state with the hint "No categories available — ask your Supervisor"
- [ ] Time entries submitted without a category display as "Uncategorized" in all views (entry list, reports, Supervisor summary)

---

## Schema / API Notes

- Table: `categories` (`id`, `name`, `is_archived`, `created_at NOT NULL`, `updated_at NOT NULL`) — see [schema.md](../architecture/schema.md)
- Unique constraint: `UNIQUE(name) WHERE is_archived = false` (partial index — enforces no duplicate active names; archived names can be reused)
- `time_entries.category_id` is nullable (`UUID REFERENCES categories(id)` — no `NOT NULL`); null renders as "Uncategorized"
- Permissions: `categories:read` (Member + Supervisor); `categories:write` (Supervisor only — covers create, rename, archive, unarchive) — see [roles-permissions.md](../architecture/roles-permissions.md)
- Filter for entry form: `WHERE is_archived = false ORDER BY name`
- Schema fix required: `categories.created_at` and `categories.updated_at` must be `NOT NULL`; same fix needed on `time_entries`

---

## Out of Scope

- Hard delete of categories
- Category ordering / drag-and-drop
- Per-category access restrictions (all Members see all categories)
- Category descriptions or metadata
