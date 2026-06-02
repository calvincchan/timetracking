import { describe, expect, it } from "vitest";
import { buildSummaryRows, buildGroupedDetailRows } from "./report-preview";
import type { TimeEntrySnapshot } from "@/types/report-snapshot";

function makeEntry(overrides: Partial<TimeEntrySnapshot> = {}): TimeEntrySnapshot {
  return {
    entry_id: "e1",
    user_id: "u1",
    user_full_name: "Alice",
    entry_date: "2026-01-15",
    duration_minutes: 60,
    category_id: "c1",
    category_name: "Dev",
    note: "",
    ...overrides,
  };
}

describe("buildSummaryRows", () => {
  it("returns one row for a single entry", () => {
    const rows = buildSummaryRows([makeEntry()]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ user: "Alice", category: "Dev", totalHours: 1 });
  });

  it("aggregates multiple entries for the same user+category", () => {
    const rows = buildSummaryRows([
      makeEntry({ duration_minutes: 90 }),
      makeEntry({ duration_minutes: 30 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalHours).toBe(2);
  });

  it("keeps separate rows for different user+category combinations", () => {
    const rows = buildSummaryRows([
      makeEntry({ user_full_name: "Alice", category_name: "Dev", duration_minutes: 60 }),
      makeEntry({ entry_id: "e2", user_full_name: "Bob", category_name: "QA", duration_minutes: 120 }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it("sorts by user then category", () => {
    const rows = buildSummaryRows([
      makeEntry({ entry_id: "e1", user_full_name: "Zara", category_name: "Dev", duration_minutes: 60 }),
      makeEntry({ entry_id: "e2", user_full_name: "Alice", category_name: "QA", duration_minutes: 30 }),
      makeEntry({ entry_id: "e3", user_full_name: "Alice", category_name: "Dev", duration_minutes: 60 }),
    ]);
    expect(rows.map((r) => `${r.user}/${r.category}`)).toEqual([
      "Alice/Dev",
      "Alice/QA",
      "Zara/Dev",
    ]);
  });

  it("converts minutes to hours with 2dp precision", () => {
    const rows = buildSummaryRows([makeEntry({ duration_minutes: 100 })]);
    expect(rows[0].totalHours).toBe(1.67);
  });

  it("returns empty array for no entries", () => {
    expect(buildSummaryRows([])).toEqual([]);
  });
});

describe("buildGroupedDetailRows", () => {
  it("returns one group per user", () => {
    const groups = buildGroupedDetailRows([
      makeEntry({ entry_id: "e1", user_full_name: "Alice" }),
      makeEntry({ entry_id: "e2", user_full_name: "Bob" }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("groups entries under the correct user", () => {
    const groups = buildGroupedDetailRows([
      makeEntry({ entry_id: "e1", user_full_name: "Alice" }),
      makeEntry({ entry_id: "e2", user_full_name: "Alice" }),
      makeEntry({ entry_id: "e3", user_full_name: "Bob" }),
    ]);
    const alice = groups.find((g) => g.user === "Alice");
    expect(alice?.rows).toHaveLength(2);
  });

  it("sorts groups alphabetically by user", () => {
    const groups = buildGroupedDetailRows([
      makeEntry({ entry_id: "e1", user_full_name: "Zara" }),
      makeEntry({ entry_id: "e2", user_full_name: "Alice" }),
    ]);
    expect(groups.map((g) => g.user)).toEqual(["Alice", "Zara"]);
  });

  it("sorts rows within a group by date asc", () => {
    const groups = buildGroupedDetailRows([
      makeEntry({ entry_id: "e1", entry_date: "2026-01-20" }),
      makeEntry({ entry_id: "e2", entry_date: "2026-01-10" }),
    ]);
    expect(groups[0].rows.map((r) => r.entry_date)).toEqual([
      "2026-01-10",
      "2026-01-20",
    ]);
  });

  it("row has expected fields", () => {
    const groups = buildGroupedDetailRows([makeEntry({ note: "worked hard" })]);
    expect(groups[0].rows[0]).toEqual({
      entry_id: "e1",
      entry_date: "2026-01-15",
      user_full_name: "Alice",
      category_name: "Dev",
      duration_minutes: 60,
      note: "worked hard",
    });
  });

  it("returns empty array for no entries", () => {
    expect(buildGroupedDetailRows([])).toEqual([]);
  });
});
