import { describe, expect, it } from "vitest";
import { buildSummaryRows, buildDetailRows } from "./report-preview";
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

describe("buildDetailRows", () => {
  it("returns one row per entry", () => {
    const rows = buildDetailRows([makeEntry(), makeEntry({ entry_id: "e2" })]);
    expect(rows).toHaveLength(2);
  });

  it("row has expected fields", () => {
    const rows = buildDetailRows([makeEntry({ note: "worked hard" })]);
    expect(rows[0]).toEqual({
      entry_date: "2026-01-15",
      user_full_name: "Alice",
      category_name: "Dev",
      duration_minutes: 60,
      note: "worked hard",
    });
  });

  it("sorts by date asc then user asc", () => {
    const rows = buildDetailRows([
      makeEntry({ entry_id: "e1", entry_date: "2026-01-20", user_full_name: "Zara" }),
      makeEntry({ entry_id: "e2", entry_date: "2026-01-10", user_full_name: "Bob" }),
      makeEntry({ entry_id: "e3", entry_date: "2026-01-10", user_full_name: "Alice" }),
    ]);
    expect(rows.map((r) => `${r.entry_date}/${r.user_full_name}`)).toEqual([
      "2026-01-10/Alice",
      "2026-01-10/Bob",
      "2026-01-20/Zara",
    ]);
  });

  it("returns empty array for no entries", () => {
    expect(buildDetailRows([])).toEqual([]);
  });
});
