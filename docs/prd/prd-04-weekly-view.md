# PRD-04: Weekly View

## Goal

Give Members a clear summary of their time entries for the current week, with the ability to navigate to any past or future week. Entries are grouped by date with daily totals and a weekly grand total.

---

## Scope

- Week picker (Sun–Sat, defaults to current week)
- List of entries grouped by date
- Daily total per date
- Weekly grand total

---

## User Stories

**US-01** As a Member, I want to see all my time entries for the current week grouped by day so that I have an overview of my logged hours.

**US-02** As a Member, I want to navigate to a previous or next week so that I can review or add entries for other weeks.

**US-03** As a Member, I want to see the total hours logged each day so that I can quickly spot days where I haven't logged enough.

**US-04** As a Member, I want to see the total hours logged for the week so that I know my weekly contribution at a glance.

---

## Acceptance Criteria

### Default view (US-01)

- [ ] Page loads showing the current Sun–Sat week
- [ ] Entries are listed in chronological order within each day group
- [ ] Each entry row shows: category name, duration (in minutes or hours:minutes), and note (if present)
- [ ] Days with no entries are shown with a "No entries" placeholder (not hidden)

### Week navigation (US-02)

- [ ] Previous and next week navigation controls are present
- [ ] Clicking previous/next shifts the displayed week by 7 days
- [ ] The current week's date range is shown in the header (e.g. "May 25 – May 31, 2026")
- [ ] A "This week" shortcut returns to the current week when navigating away

### Daily totals (US-03)

- [ ] Each date group header shows the sum of `duration_minutes` for that day
- [ ] Total is displayed in a readable format (e.g. "2 h 30 min" or "150 min")
- [ ] Total updates immediately when an entry is added, edited, or deleted

### Weekly grand total (US-04)

- [ ] A grand total is displayed at the bottom (or top) of the week view
- [ ] Total is the sum of all entries for the displayed Sun–Sat period
- [ ] Total updates immediately when any entry changes

---

## Schema / API Notes

- Query: `SELECT * FROM time_entries WHERE user_id = auth.uid() AND entry_date BETWEEN :week_start AND :week_end ORDER BY entry_date, created_at`
- Week boundaries: Sunday 00:00 to Saturday 23:59 (date only, no time component)
- `entry_date` is a `date` column — no timezone conversion needed

---

## Out of Scope

- Overtime highlighting or thresholds
- Supervisor viewing other Members' weekly views
- Calendar grid layout (list only in v1)
- Export from the weekly view (use Reports — see [prd-05-reports.md](./prd-05-reports.md))
