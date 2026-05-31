import { describe, expect, it } from "vitest";
import {
  buildWeekDays,
  categoryName,
  formatDateISO,
  formatDuration,
  groupEntriesByDay,
  shiftWeek,
  startOfWeek,
  sumMinutes,
  truncateNote,
  weekRangeFilters,
  type WeekEntry,
} from "./week-utils";

// 2026-05-31 is a Sunday; 2026-05-27 is the Wednesday of that week.
function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function makeEntry(overrides: Partial<WeekEntry>): WeekEntry {
  return {
    id: "e1",
    user_id: "u1",
    category_id: null,
    duration_minutes: 60,
    entry_date: "2026-05-31",
    is_locked: false,
    note: "",
    created_at: null,
    updated_at: null,
    category: null,
    ...overrides,
  };
}

describe("startOfWeek", () => {
  it("returns the Sunday for a mid-week date", () => {
    expect(formatDateISO(startOfWeek(localDate("2026-05-27")))).toBe(
      "2026-05-24",
    );
  });

  it("returns the same day when given a Sunday", () => {
    expect(formatDateISO(startOfWeek(localDate("2026-05-31")))).toBe(
      "2026-05-31",
    );
  });

  it("returns the Sunday for a Saturday", () => {
    // 2026-05-30 is the Saturday of the week starting 2026-05-24.
    expect(formatDateISO(startOfWeek(localDate("2026-05-30")))).toBe(
      "2026-05-24",
    );
  });

  it("normalizes away the time component", () => {
    const d = new Date(2026, 4, 27, 15, 30, 45, 123);
    const start = startOfWeek(d);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);
  });
});

describe("shiftWeek", () => {
  it("moves forward by 7 days per week", () => {
    expect(formatDateISO(shiftWeek(localDate("2026-05-24"), 1))).toBe(
      "2026-05-31",
    );
  });

  it("moves backward by 7 days per week", () => {
    expect(formatDateISO(shiftWeek(localDate("2026-05-24"), -1))).toBe(
      "2026-05-17",
    );
  });

  it("crosses a month boundary", () => {
    expect(formatDateISO(shiftWeek(localDate("2026-05-31"), 1))).toBe(
      "2026-06-07",
    );
  });
});

describe("formatDateISO", () => {
  it("formats with zero-padded month and day in local time", () => {
    expect(formatDateISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(90)).toBe("1h 30m");
  });

  it("omits minutes when zero", () => {
    expect(formatDuration(120)).toBe("2h");
  });

  it("omits hours when under an hour", () => {
    expect(formatDuration(45)).toBe("45m");
  });

  it("returns 0m for zero", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("clamps negatives to 0m", () => {
    expect(formatDuration(-10)).toBe("0m");
  });
});

describe("categoryName", () => {
  it("returns the joined category name", () => {
    expect(categoryName(makeEntry({ category: { name: "Development" } }))).toBe(
      "Development",
    );
  });

  it("returns Uncategorized when the category is null", () => {
    expect(categoryName(makeEntry({ category: null }))).toBe("Uncategorized");
  });

  it("returns Uncategorized when the category is missing", () => {
    const entry = makeEntry({});
    delete entry.category;
    expect(categoryName(entry)).toBe("Uncategorized");
  });
});

describe("truncateNote", () => {
  it("leaves short notes untouched", () => {
    expect(truncateNote("short", 80)).toBe("short");
  });

  it("truncates and appends an ellipsis", () => {
    const note = "x".repeat(100);
    const result = truncateNote(note, 80);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBe(81);
  });
});

describe("buildWeekDays", () => {
  it("produces seven days from Sunday through Saturday", () => {
    const days = buildWeekDays(localDate("2026-05-24"));
    expect(days).toHaveLength(7);
    expect(days[0].dateISO).toBe("2026-05-24");
    expect(days[0].weekday).toBe("Sunday");
    expect(days[6].dateISO).toBe("2026-05-30");
    expect(days[6].weekday).toBe("Saturday");
  });

  it("builds a human label per day", () => {
    const days = buildWeekDays(localDate("2026-05-24"));
    expect(days[0].label).toBe("Sunday, May 24");
  });
});

describe("groupEntriesByDay", () => {
  it("buckets entries under the matching day", () => {
    const entries = [
      makeEntry({ id: "a", entry_date: "2026-05-24" }),
      makeEntry({ id: "b", entry_date: "2026-05-24" }),
      makeEntry({ id: "c", entry_date: "2026-05-27" }),
    ];
    const groups = groupEntriesByDay(entries, localDate("2026-05-24"));
    expect(groups).toHaveLength(7);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["a", "b"]);
    expect(groups[3].entries.map((e) => e.id)).toEqual(["c"]);
  });

  it("leaves days with no entries empty", () => {
    const groups = groupEntriesByDay([], localDate("2026-05-24"));
    expect(groups.every((g) => g.entries.length === 0)).toBe(true);
  });

  it("ignores entries outside the displayed week", () => {
    const entries = [makeEntry({ id: "x", entry_date: "2026-06-01" })];
    const groups = groupEntriesByDay(entries, localDate("2026-05-24"));
    expect(groups.flatMap((g) => g.entries)).toHaveLength(0);
  });
});

describe("sumMinutes", () => {
  it("sums duration_minutes across entries", () => {
    const entries = [
      makeEntry({ duration_minutes: 30 }),
      makeEntry({ duration_minutes: 45 }),
      makeEntry({ duration_minutes: 90 }),
    ];
    expect(sumMinutes(entries)).toBe(165);
  });

  it("returns 0 for empty array", () => {
    expect(sumMinutes([])).toBe(0);
  });

  it("returns the single entry value", () => {
    expect(sumMinutes([makeEntry({ duration_minutes: 75 })])).toBe(75);
  });
});

describe("weekRangeFilters", () => {
  it("builds inclusive gte/lte filters for the Sunday–Saturday range", () => {
    expect(weekRangeFilters(localDate("2026-05-24"))).toEqual([
      { field: "entry_date", operator: "gte", value: "2026-05-24" },
      { field: "entry_date", operator: "lte", value: "2026-05-30" },
    ]);
  });
});
