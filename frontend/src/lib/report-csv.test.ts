import { describe, expect, it } from "vitest";
import { buildReportCsv } from "./report-csv";
import type { Json } from "@/types/database";

function makeEntry(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
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

describe("buildReportCsv", () => {
  it("returns headers-only for empty snapshot", () => {
    const csv = buildReportCsv([]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("User,Category,Total Hours");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("Date,User,Category,Duration (hours),Note");
    expect(lines).toHaveLength(3);
  });

  it("returns headers-only when snapshot is not an array", () => {
    const csv = buildReportCsv(null as unknown as Json);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("User,Category,Total Hours");
    expect(lines).toHaveLength(3);
  });

  it("includes detail row for a valid entry (entry_id key)", () => {
    const csv = buildReportCsv([makeEntry()] as Json);
    const lines = csv.split("\n");
    // summary row
    expect(lines[1]).toBe("Alice,Dev,1");
    // detail row
    expect(lines[4]).toBe("2026-01-15,Alice,Dev,1,");
  });

  it("rejects entries missing entry_id (produces empty data rows)", () => {
    const badEntry = { id: "e1", entry_date: "2026-01-15", duration_minutes: 60, user_full_name: "Bob", category_name: "Dev", note: "" };
    const csv = buildReportCsv([badEntry] as Json);
    const lines = csv.split("\n");
    // no summary data row
    expect(lines[1]).toBe("");
    // no detail data row
    expect(lines).toHaveLength(3);
  });

  it("aggregates summary by user + category", () => {
    const snapshot = [
      makeEntry({ entry_id: "e1", duration_minutes: 90 }),
      makeEntry({ entry_id: "e2", duration_minutes: 30 }),
    ] as Json;
    const csv = buildReportCsv(snapshot);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("Alice,Dev,2");
  });

  it("escapes commas in cell values", () => {
    const snapshot = [makeEntry({ user_full_name: "Smith, John" })] as Json;
    const csv = buildReportCsv(snapshot);
    expect(csv).toContain('"Smith, John"');
  });
});
