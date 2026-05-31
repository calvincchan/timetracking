# ADR-0001: Enrich report snapshot with resolved display names

**Status:** Accepted

## Context

`reports.time_entries_snapshot` stores a JSONB array of `TimeEntrySnapshot` records at generation time. The original type only stored `user_id` and `category_id`. Re-downloading a past report required joining against live `profiles` and `categories` tables to resolve display names.

## Decision

Enrich each snapshot entry with `user_full_name` and `category_name` at generation time (inside the `generate_report` RPC, which joins `profiles` and `categories` before inserting).

## Consequences

Re-downloads are self-contained — correct even if a user is deactivated or a category is deleted after the report is generated. Reports are accounting artefacts and must be reproducible exactly. The trade-off is that snapshot entries are larger and contain data that duplicates live tables at the moment of generation.
