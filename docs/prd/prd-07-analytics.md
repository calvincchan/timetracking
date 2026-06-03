# PRD-07: Analytics

## Goal

Give Supervisors a live, read-only page to explore time entry data by date range and member without generating a formal Report. No entries are locked, no snapshot is written, and no data is mutated.

---

## Scope

- Supervisor-only Analytics page in the sidebar
- Date range presets (This Week, Last Week, This Month, Last Month) and custom range
- Optional single-member filter
- KPI cards (team-wide and per-member views)
- Charts: stacked bar, horizontal bar, daily bar, pie/donut
- Detail table with sorting and pagination
- Filter state persisted in URL

---

## User Stories

**US-01** As a Supervisor, I want a dedicated Analytics page in the sidebar so that I can explore time entry data without generating a formal Report.

**US-02** As a Supervisor, I want to filter analytics by a date range preset (This Week, Last Week, This Month, Last Month) so that I can quickly see data for common periods.

**US-03** As a Supervisor, I want to set a custom date range so that I can analyse arbitrary periods like payroll cycles.

**US-04** As a Supervisor, I want the Analytics page to default to the current month on load so that I see relevant data immediately without configuring filters.

**US-05** As a Supervisor, I want filters to be reflected in the URL so that I can bookmark or share a specific filtered view with another Supervisor.

**US-06** As a Supervisor, I want to see Total Hours for all Members in the selected period so that I understand total team output at a glance.

**US-07** As a Supervisor, I want to see how many Members are active (have at least one entry) in the selected period so that I can identify non-participating Members.

**US-08** As a Supervisor, I want to see the average hours per active Member for the period so that I can gauge workload distribution.

**US-09** As a Supervisor, I want to see the top Category by hours for the period so that I understand where team effort is concentrated.

**US-10** As a Supervisor, I want to filter analytics down to a single Member so that I can review one person's activity in detail.

**US-11** As a Supervisor, I want the Member filter to default to "All Members" so that I see team-wide data by default.

**US-12** As a Supervisor viewing a single Member, I want to see that Member's Total Hours, Days Logged, Average Hours per Day, and Top Category so that I have a focused individual summary.

**US-13** As a Supervisor viewing all Members, I want a stacked bar chart of hours over time (stacked by Member) so that I can see each person's contribution trend.

**US-14** As a Supervisor viewing all Members, I want a horizontal bar chart of hours by Category so that I can compare category workload distribution.

**US-15** As a Supervisor viewing a single Member, I want a bar chart of that Member's hours per day so that I can see their daily work pattern and gaps.

**US-16** As a Supervisor viewing a single Member, I want a pie/donut chart of that Member's hours by Category so that I can see how their time is distributed.

**US-17** As a Supervisor, I want the time-axis granularity to switch from daily to weekly automatically when the period exceeds one month so that charts remain readable for longer ranges.

**US-18** As a Supervisor, I want a detail table below the charts showing individual time entries (Date, Member, Category, Duration, Note) so that I can inspect the raw data behind the aggregates.

**US-19** As a Supervisor viewing all Members, I want the Member column visible in the detail table so that I can identify whose entry each row belongs to.

**US-20** As a Supervisor viewing a single Member, I want the Member column hidden in the detail table so that the redundant column doesn't clutter the view.

**US-21** As a Supervisor, I want the detail table sorted by Date descending by default so that I see the most recent entries first.

**US-22** As a Supervisor, I want to click column headers in the detail table to sort by that column so that I can reorder entries to find what I need.

**US-23** As a Supervisor, I want the detail table paginated at 50 rows per page so that long periods don't produce an unscrollable wall of rows.

**US-24** As a Supervisor, I want the Analytics page to reflect the current state of entries at query time so that I always see up-to-date data without locking or snapshot overhead.

**US-25** As a Supervisor, I want the Analytics page to be inaccessible to Members so that Members cannot view other Members' time data.

---

## Acceptance Criteria

### Access & Navigation (US-01, US-25)

- [ ] "Analytics" appears in the sidebar with the `BarChart2` (Lucide) icon, visible only to Supervisors
- [ ] Route is `/analytics`
- [ ] Members receive a permission-denied response when navigating to `/analytics`
- [ ] Access control uses the existing `reports:read` permission (no new permission required)

### Filters (US-02 – US-05, US-10, US-11)

- [ ] Date range presets: This Week (Sun–Sat), Last Week, This Month, Last Month, Custom
- [ ] Custom preset reveals a date range picker
- [ ] Member filter: single-select populated from the `members` view; "All Members" is the default (no `user_id` param)
- [ ] Cold-load default: `from` = first day of current month, `to` = last day of current month
- [ ] URL params on filter change: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD), `user_id` (UUID; omitted for All Members)
- [ ] Reloading the page with URL params restores filter state exactly

### KPI Cards — All Members view (US-06 – US-09)

- [ ] Total Hours displayed
- [ ] Active Members count displayed (members with ≥ 1 entry in range)
- [ ] Avg Hours/Member displayed
- [ ] Top Category displayed

### KPI Cards — Single-member view (US-12)

- [ ] Total Hours displayed
- [ ] Days Logged displayed
- [ ] Avg Hours/Day displayed
- [ ] Top Category displayed

### Charts — All Members view (US-13, US-14, US-17)

- [ ] Stacked bar chart: X-axis = time buckets, series = members keyed by `user_id`
- [ ] Horizontal bar chart: Y-axis = category names, X-axis = hours
- [ ] Granularity is daily when period ≤ 31 days; weekly (Sun–Sat buckets) when period > 31 days

### Charts — Single-member view (US-15, US-16, US-17)

- [ ] Bar chart: X-axis = dates, Y-axis = hours
- [ ] Pie/donut chart: slices = categories
- [ ] Granularity follows the same daily/weekly rule as the all-members view

### Detail Table (US-18 – US-23)

- [ ] Columns: Date, Member (conditional), Category, Duration, Note
- [ ] Member column present in All Members view; hidden in single-member view
- [ ] "Uncategorized" shown for entries with no category
- [ ] Duration formatted in hours (e.g. `2.5 h`), matching the Reports convention
- [ ] Default sort: Date descending
- [ ] Clicking a column header sorts by that column
- [ ] Pagination: 50 rows per page

### Data & Freshness (US-24)

- [ ] Data fetches from `time_entries` live on filter change; no caching beyond React Query defaults
- [ ] No writes to any table (no locking, no snapshot inserts)

---

## Schema / API Notes

- Tables: `time_entries`, `profiles`, `categories` — see [schema.md](../architecture/schema.md)
- Refine resource name: `"analytics"` (virtual — no backing table)
- Access control: `analytics:list` maps to `reports:read` check in the access control provider
- Data fetching: direct `supabaseClient` query wrapped in `useQuery`; no Refine `useList` or `useCustom`
- Aggregation functions extracted into `src/pages/analytics/analytics-utils.ts` (pure, unit-testable)
- Week definition: Sunday–Saturday (per CONTEXT.md domain glossary)

---

## Out of Scope

- CSV or any other export from the Analytics page (export is the responsibility of Reports)
- Supabase Realtime live updates
- Member self-service analytics (separate feature, separate access control path)
- `employment_type` breakdown in charts or KPIs (data captured; hidden in v1 UI)
- Period comparison (e.g. this month vs last month side-by-side)
- Server-side aggregation via RPC functions (client-side sufficient for v1)
