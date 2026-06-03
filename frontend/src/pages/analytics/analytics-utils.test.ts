import { describe, expect, it } from "vitest";
import {
  buildDailyBarSeries,
  buildHorizontalBarSeries,
  buildPieSeries,
  buildStackedBarSeries,
  buildTimeBuckets,
  computeAllMembersKpi,
  computeSingleMemberKpi,
  type AnalyticsEntry,
} from "./analytics-utils";

function makeEntry(overrides: Partial<AnalyticsEntry> = {}): AnalyticsEntry {
  return {
    id: "e1",
    entry_date: "2026-01-05",
    duration_minutes: 60,
    user_id: "u1",
    user_full_name: "Alice",
    category_id: "c1",
    category_name: "Dev",
    note: "",
    ...overrides,
  };
}

// ── computeAllMembersKpi ──────────────────────────────────────────────────────

describe("computeAllMembersKpi", () => {
  it("computes totals for a single entry", () => {
    const kpi = computeAllMembersKpi([makeEntry({ duration_minutes: 120 })]);
    expect(kpi.totalHours).toBe(2);
    expect(kpi.activeMemberCount).toBe(1);
    expect(kpi.avgHoursPerMember).toBe(2);
    expect(kpi.topCategory).toBe("Dev");
  });

  it("counts distinct members", () => {
    const kpi = computeAllMembersKpi([
      makeEntry({ user_id: "u1" }),
      makeEntry({ id: "e2", user_id: "u2", user_full_name: "Bob" }),
    ]);
    expect(kpi.activeMemberCount).toBe(2);
  });

  it("uses Uncategorized when category_id is null", () => {
    const kpi = computeAllMembersKpi([makeEntry({ category_id: null, category_name: "" })]);
    expect(kpi.topCategory).toBe("Uncategorized");
  });

  it("identifies top category by most minutes", () => {
    const kpi = computeAllMembersKpi([
      makeEntry({ duration_minutes: 60, category_id: "c1", category_name: "Dev" }),
      makeEntry({ id: "e2", duration_minutes: 120, category_id: "c2", category_name: "Meetings" }),
    ]);
    expect(kpi.topCategory).toBe("Meetings");
  });

  it("returns zeros for empty input", () => {
    const kpi = computeAllMembersKpi([]);
    expect(kpi.totalHours).toBe(0);
    expect(kpi.activeMemberCount).toBe(0);
    expect(kpi.avgHoursPerMember).toBe(0);
  });

  it("avgHoursPerMember is not pre-rounded before toHours", () => {
    // 100 min / 3 members = 33.333…min; toHours(33.333) = 0.56, not toHours(33) = 0.55
    const kpi = computeAllMembersKpi([
      makeEntry({ user_id: "u1", duration_minutes: 34 }),
      makeEntry({ id: "e2", user_id: "u2", duration_minutes: 33 }),
      makeEntry({ id: "e3", user_id: "u3", duration_minutes: 33 }),
    ]);
    expect(kpi.avgHoursPerMember).toBe(0.56);
  });
});

// ── computeSingleMemberKpi ────────────────────────────────────────────────────

describe("computeSingleMemberKpi", () => {
  it("computes totals for a single entry", () => {
    const kpi = computeSingleMemberKpi([makeEntry({ duration_minutes: 90 })]);
    expect(kpi.totalHours).toBe(1.5);
    expect(kpi.daysLogged).toBe(1);
    expect(kpi.avgHoursPerDay).toBe(1.5);
    expect(kpi.topCategory).toBe("Dev");
  });

  it("counts distinct days", () => {
    const kpi = computeSingleMemberKpi([
      makeEntry({ entry_date: "2026-01-05" }),
      makeEntry({ id: "e2", entry_date: "2026-01-06" }),
      makeEntry({ id: "e3", entry_date: "2026-01-05" }),
    ]);
    expect(kpi.daysLogged).toBe(2);
  });

  it("uses Uncategorized when category_id is null", () => {
    const kpi = computeSingleMemberKpi([makeEntry({ category_id: null, category_name: "" })]);
    expect(kpi.topCategory).toBe("Uncategorized");
  });

  it("returns zeros for empty input", () => {
    const kpi = computeSingleMemberKpi([]);
    expect(kpi.totalHours).toBe(0);
    expect(kpi.daysLogged).toBe(0);
    expect(kpi.avgHoursPerDay).toBe(0);
  });

  it("avgHoursPerDay is not pre-rounded before toHours", () => {
    // 100 min / 3 days = 33.333…min; toHours(33.333) = 0.56, not toHours(33) = 0.55
    const kpi = computeSingleMemberKpi([
      makeEntry({ id: "e1", entry_date: "2026-01-05", duration_minutes: 34 }),
      makeEntry({ id: "e2", entry_date: "2026-01-06", duration_minutes: 33 }),
      makeEntry({ id: "e3", entry_date: "2026-01-07", duration_minutes: 33 }),
    ]);
    expect(kpi.avgHoursPerDay).toBe(0.56);
  });
});

// ── buildTimeBuckets ──────────────────────────────────────────────────────────

describe("buildTimeBuckets", () => {
  it("produces daily buckets for a 31-day range", () => {
    // Jan 1 to Jan 31 = 30 diff days → ≤31, daily
    const buckets = buildTimeBuckets("2026-01-01", "2026-01-31");
    expect(buckets).toHaveLength(31);
    expect(buckets[0].key).toBe("2026-01-01");
    expect(buckets[30].key).toBe("2026-01-31");
  });

  it("produces weekly buckets for a 32-day range", () => {
    // Jan 1 to Feb 1 = 31 diff days → >31, weekly
    const buckets = buildTimeBuckets("2026-01-01", "2026-02-01");
    // Expect weekly buckets, each spanning 7 days
    expect(buckets.length).toBeGreaterThan(0);
    for (const b of buckets) {
      const fromD = new Date(b.from + "T00:00:00");
      const toD = new Date(b.to + "T00:00:00");
      const span = Math.round((toD.getTime() - fromD.getTime()) / 86_400_000);
      expect(span).toBe(6);
    }
  });

  it("weekly buckets start on Sunday", () => {
    const buckets = buildTimeBuckets("2026-01-01", "2026-02-01");
    for (const b of buckets) {
      const day = new Date(b.from + "T00:00:00").getDay();
      expect(day).toBe(0); // 0 = Sunday
    }
  });

  it("daily bucket from === to for each day", () => {
    const buckets = buildTimeBuckets("2026-01-10", "2026-01-12");
    for (const b of buckets) {
      expect(b.from).toBe(b.to);
    }
  });

  it("exact 31-day range is daily (boundary)", () => {
    // diff = 30 → ≤31 → daily
    const buckets = buildTimeBuckets("2026-01-01", "2026-01-31");
    expect(buckets[0].from).toBe(buckets[0].to);
  });

  it("exact 32-day range is weekly (boundary)", () => {
    // diff = 31 → >31 → weekly
    const buckets = buildTimeBuckets("2026-01-01", "2026-02-01");
    const first = buckets[0];
    expect(first.from).not.toBe(first.to);
  });
});

// ── buildStackedBarSeries ─────────────────────────────────────────────────────

describe("buildStackedBarSeries", () => {
  it("places entry hours in correct bucket and member key", () => {
    const entries = [makeEntry({ entry_date: "2026-01-05", duration_minutes: 120 })];
    const series = buildStackedBarSeries(entries, "2026-01-05", "2026-01-07");
    const bucket = series.find((d) => d["Alice"] !== undefined);
    expect(bucket).toBeDefined();
    expect(bucket!["Alice"]).toBe(2);
  });

  it("returns zero-member buckets for days with no entries", () => {
    const series = buildStackedBarSeries([], "2026-01-05", "2026-01-07");
    expect(series).toHaveLength(3);
    // No member keys beyond 'bucket'
    for (const d of series) {
      expect(Object.keys(d)).toEqual(["bucket"]);
    }
  });

  it("aggregates multiple entries for the same member in one bucket", () => {
    const entries = [
      makeEntry({ id: "e1", entry_date: "2026-01-05", duration_minutes: 60 }),
      makeEntry({ id: "e2", entry_date: "2026-01-05", duration_minutes: 60 }),
    ];
    const series = buildStackedBarSeries(entries, "2026-01-05", "2026-01-05");
    expect(series[0]["Alice"]).toBe(2);
  });

  it("places entry in the correct weekly bucket for a >31-day range", () => {
    // Jan 1 – Feb 1 → weekly; Jan 14 falls in the week containing Jan 11–17
    const entries = [makeEntry({ entry_date: "2026-01-14", duration_minutes: 120 })];
    const series = buildStackedBarSeries(entries, "2026-01-01", "2026-02-01");
    const nonEmpty = series.filter((d) => "Alice" in d);
    expect(nonEmpty).toHaveLength(1);
    expect(nonEmpty[0]["Alice"]).toBe(2);
  });
});

// ── buildHorizontalBarSeries ──────────────────────────────────────────────────

describe("buildHorizontalBarSeries", () => {
  it("returns one datum per category sorted descending by hours", () => {
    const entries = [
      makeEntry({ duration_minutes: 60, category_id: "c1", category_name: "Dev" }),
      makeEntry({ id: "e2", duration_minutes: 120, category_id: "c2", category_name: "Meetings" }),
    ];
    const series = buildHorizontalBarSeries(entries);
    expect(series[0].category).toBe("Meetings");
    expect(series[1].category).toBe("Dev");
  });

  it("uses Uncategorized for null category_id", () => {
    const series = buildHorizontalBarSeries([makeEntry({ category_id: null, category_name: "" })]);
    expect(series[0].category).toBe("Uncategorized");
  });

  it("returns empty array for no entries", () => {
    expect(buildHorizontalBarSeries([])).toEqual([]);
  });
});

// ── buildDailyBarSeries ───────────────────────────────────────────────────────

describe("buildDailyBarSeries", () => {
  it("returns a datum per bucket with correct hours", () => {
    const entries = [makeEntry({ entry_date: "2026-01-05", duration_minutes: 90 })];
    const series = buildDailyBarSeries(entries, "2026-01-05", "2026-01-06");
    expect(series).toHaveLength(2);
    expect(series[0].hours).toBe(1.5);
    expect(series[1].hours).toBe(0);
  });

  it("returns zeroes for all buckets when no entries", () => {
    const series = buildDailyBarSeries([], "2026-01-05", "2026-01-07");
    expect(series.every((d) => d.hours === 0)).toBe(true);
  });

  it("accumulates entry hours into weekly bucket when range >31 days", () => {
    // Jan 1 – Feb 1 is 32 inclusive days → weekly buckets
    // Jan 14 falls in the week Jan 11–17
    const entries = [makeEntry({ entry_date: "2026-01-14", duration_minutes: 120 })];
    const series = buildDailyBarSeries(entries, "2026-01-01", "2026-02-01");
    const nonZero = series.filter((d) => d.hours > 0);
    expect(nonZero).toHaveLength(1);
    expect(nonZero[0].hours).toBe(2);
  });
});

// ── buildPieSeries ────────────────────────────────────────────────────────────

describe("buildPieSeries", () => {
  it("returns one datum per category sorted descending", () => {
    const entries = [
      makeEntry({ duration_minutes: 60, category_id: "c1", category_name: "Dev" }),
      makeEntry({ id: "e2", duration_minutes: 180, category_id: "c2", category_name: "Meetings" }),
    ];
    const series = buildPieSeries(entries);
    expect(series[0]).toEqual({ name: "Meetings", value: 3 });
    expect(series[1]).toEqual({ name: "Dev", value: 1 });
  });

  it("uses Uncategorized for null category_id", () => {
    const series = buildPieSeries([makeEntry({ category_id: null, category_name: "" })]);
    expect(series[0].name).toBe("Uncategorized");
  });

  it("returns empty array for no entries", () => {
    expect(buildPieSeries([])).toEqual([]);
  });
});
