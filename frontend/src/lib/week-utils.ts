import type { CrudFilter } from "@refinedev/core";
import type { Tables } from "@/types/database";

// A time entry row joined with its (optional) category name. The week view
// selects `*, category:categories(name)`; entries without a category come back
// with `category: null`.
export type WeekEntry = Tables<"time_entries"> & {
  category?: { name: string } | null;
};

export interface DayGroup {
  dateISO: string; // local YYYY-MM-DD
  weekday: string; // "Sunday" … "Saturday"
  label: string; // e.g. "Sunday, May 24"
  entries: WeekEntry[];
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const DAYS_IN_WEEK = 7;

// Local midnight copy of a date with the time component stripped.
function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, n: number): Date {
  const d = atMidnight(date);
  d.setDate(d.getDate() + n);
  return d;
}

// The Sunday at or before the given date (week starts on Sunday).
export function startOfWeek(date: Date): Date {
  const d = atMidnight(date);
  return addDays(d, -d.getDay());
}

// Shift a date by whole weeks (negative for previous weeks).
export function shiftWeek(date: Date, weeks: number): Date {
  return addDays(date, weeks * DAYS_IN_WEEK);
}

// Local-time YYYY-MM-DD. Avoids the UTC shift that toISOString() would apply.
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Human-readable duration: "1h 30m", "2h", "45m", or "0m".
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  return parts.length > 0 ? parts.join(" ") : "0m";
}

// Resolved category label, falling back to "Uncategorized".
export function categoryName(entry: WeekEntry): string {
  return entry.category?.name ?? "Uncategorized";
}

// Truncate a note to `max` characters, appending an ellipsis when clipped.
export function truncateNote(note: string, max = 80): string {
  if (note.length <= max) return note;
  return note.slice(0, max) + "…";
}

// The seven day descriptors for the week beginning at `weekStart` (a Sunday).
export function buildWeekDays(weekStart: Date): DayGroup[] {
  const start = startOfWeek(weekStart);
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const day = addDays(start, i);
    const weekday = WEEKDAYS[day.getDay()];
    return {
      dateISO: formatDateISO(day),
      weekday,
      label: `${weekday}, ${MONTHS[day.getMonth()]} ${day.getDate()}`,
      entries: [],
    };
  });
}

// Group entries under their day, returning all seven days (empty ones included).
export function groupEntriesByDay(
  entries: WeekEntry[],
  weekStart: Date,
): DayGroup[] {
  const days = buildWeekDays(weekStart);
  const byDate = new Map(days.map((d) => [d.dateISO, d]));
  for (const entry of entries) {
    byDate.get(entry.entry_date)?.entries.push(entry);
  }
  return days;
}

// Refine filters selecting entries whose entry_date falls within the displayed
// week, Sunday through Saturday inclusive.
export function weekRangeFilters(weekStart: Date): CrudFilter[] {
  const start = startOfWeek(weekStart);
  const end = addDays(start, DAYS_IN_WEEK - 1);
  return [
    { field: "entry_date", operator: "gte", value: formatDateISO(start) },
    { field: "entry_date", operator: "lte", value: formatDateISO(end) },
  ];
}
