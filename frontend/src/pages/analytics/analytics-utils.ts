import { toHours } from "@/lib/report-preview";
import { addDays, format, startOfWeek } from "date-fns";

export type AnalyticsEntry = {
  id: string;
  entry_date: string;
  duration_minutes: number;
  user_id: string;
  user_full_name: string;
  category_id: string | null;
  category_name: string;
  note: string;
};

export type AllMembersKpi = {
  totalHours: number;
  activeMemberCount: number;
  avgHoursPerMember: number;
  topCategory: string;
};

export type SingleMemberKpi = {
  totalHours: number;
  daysLogged: number;
  avgHoursPerDay: number;
  topCategory: string;
};

// Recharts stacked bar: { bucket: string; [memberName]: number }
export type StackedBarDatum = { bucket: string; [key: string]: string | number };

export type HorizontalBarDatum = {
  category: string;
  hours: number;
};

export type DailyBarDatum = {
  date: string;
  hours: number;
};

export type PieDatum = {
  name: string;
  value: number;
};

const UNCATEGORIZED = "Uncategorized";

function resolvedCategory(entry: Pick<AnalyticsEntry, "category_id" | "category_name">): string {
  return entry.category_id === null ? UNCATEGORIZED : entry.category_name;
}

function topCategoryFromMinutes(minutesByCategory: Map<string, number>): string {
  if (minutesByCategory.size === 0) return UNCATEGORIZED;
  let topCat = UNCATEGORIZED;
  let topMin = 0;
  for (const [cat, mins] of minutesByCategory) {
    if (mins > topMin) {
      topMin = mins;
      topCat = cat;
    }
  }
  return topCat;
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

export function computeAllMembersKpi(entries: AnalyticsEntry[]): AllMembersKpi {
  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);
  const memberSet = new Set(entries.map((e) => e.user_id));
  const activeMemberCount = memberSet.size;

  const minutesByCategory = new Map<string, number>();
  for (const e of entries) {
    const cat = resolvedCategory(e);
    minutesByCategory.set(cat, (minutesByCategory.get(cat) ?? 0) + e.duration_minutes);
  }

  const totalHours = toHours(totalMinutes);
  const avgHoursPerMember = activeMemberCount > 0
    ? toHours(totalMinutes / activeMemberCount)
    : 0;

  return {
    totalHours,
    activeMemberCount,
    avgHoursPerMember,
    topCategory: topCategoryFromMinutes(minutesByCategory),
  };
}

export function computeSingleMemberKpi(entries: AnalyticsEntry[]): SingleMemberKpi {
  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);
  const daySet = new Set(entries.map((e) => e.entry_date));
  const daysLogged = daySet.size;

  const minutesByCategory = new Map<string, number>();
  for (const e of entries) {
    const cat = resolvedCategory(e);
    minutesByCategory.set(cat, (minutesByCategory.get(cat) ?? 0) + e.duration_minutes);
  }

  const totalHours = toHours(totalMinutes);
  const avgHoursPerDay = daysLogged > 0
    ? toHours(totalMinutes / daysLogged)
    : 0;

  return {
    totalHours,
    daysLogged,
    avgHoursPerDay,
    topCategory: topCategoryFromMinutes(minutesByCategory),
  };
}

// ── Time-bucket grouper ───────────────────────────────────────────────────────

export type TimeBucket = {
  key: string;   // "2026-01-05" (daily) or "2026-W02" (weekly)
  label: string; // "Jan 5" or "Jan 5–11"
  from: string;  // yyyy-MM-dd
  to: string;    // yyyy-MM-dd (inclusive)
};

export function buildTimeBuckets(from: string, to: string): TimeBucket[] {
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T00:00:00");
  // inclusive day count: Jan 1–Jan 31 = 31 days (diffDays=30)
  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
  const daily = diffDays + 1 <= 31;

  const buckets: TimeBucket[] = [];

  if (daily) {
    let cur = fromDate;
    while (cur <= toDate) {
      const key = format(cur, "yyyy-MM-dd");
      buckets.push({ key, label: format(cur, "MMM d"), from: key, to: key });
      cur = addDays(cur, 1);
    }
  } else {
    // Weekly: Sun–Sat buckets
    let cur = startOfWeek(fromDate, { weekStartsOn: 0 });
    while (cur <= toDate) {
      const weekFrom = cur;
      const weekTo = addDays(cur, 6);
      const key = format(weekFrom, "yyyy-'W'II");
      const label = `${format(weekFrom, "MMM d")}–${format(weekTo, "MMM d")}`;
      buckets.push({
        key,
        label,
        from: format(weekFrom, "yyyy-MM-dd"),
        to: format(weekTo, "yyyy-MM-dd"),
      });
      cur = addDays(cur, 7);
    }
  }

  return buckets;
}

// ── Chart series builders ─────────────────────────────────────────────────────

export function buildStackedBarSeries(
  entries: AnalyticsEntry[],
  from: string,
  to: string,
): StackedBarDatum[] {
  const buckets = buildTimeBuckets(from, to);

  // Build a lookup: bucketKey -> memberName -> totalMinutes
  const matrix = new Map<string, Map<string, number>>();
  for (const b of buckets) matrix.set(b.key, new Map());

  for (const entry of entries) {
    const bucket = buckets.find((b) => entry.entry_date >= b.from && entry.entry_date <= b.to);
    if (!bucket) continue;
    const row = matrix.get(bucket.key)!;
    const name = entry.user_full_name;
    row.set(name, (row.get(name) ?? 0) + entry.duration_minutes);
  }

  return buckets.map((b) => {
    const row = matrix.get(b.key)!;
    const datum: StackedBarDatum = { bucket: b.label };
    for (const [member, minutes] of row) {
      datum[member] = toHours(minutes);
    }
    return datum;
  });
}

export function buildHorizontalBarSeries(entries: AnalyticsEntry[]): HorizontalBarDatum[] {
  const minutesByCategory = new Map<string, number>();
  for (const e of entries) {
    const cat = resolvedCategory(e);
    minutesByCategory.set(cat, (minutesByCategory.get(cat) ?? 0) + e.duration_minutes);
  }
  return Array.from(minutesByCategory.entries())
    .map(([category, minutes]) => ({ category, hours: toHours(minutes) }))
    .sort((a, b) => b.hours - a.hours);
}

export function buildDailyBarSeries(
  entries: AnalyticsEntry[],
  from: string,
  to: string,
): DailyBarDatum[] {
  const buckets = buildTimeBuckets(from, to);
  const minutesByBucket = new Map<string, number>();
  for (const b of buckets) minutesByBucket.set(b.key, 0);

  for (const e of entries) {
    const bucket = buckets.find((b) => e.entry_date >= b.from && e.entry_date <= b.to);
    if (!bucket) continue;
    minutesByBucket.set(bucket.key, (minutesByBucket.get(bucket.key) ?? 0) + e.duration_minutes);
  }

  return buckets.map((b) => ({
    date: b.label,
    hours: toHours(minutesByBucket.get(b.key) ?? 0),
  }));
}

export function buildPieSeries(entries: AnalyticsEntry[]): PieDatum[] {
  const minutesByCategory = new Map<string, number>();
  for (const e of entries) {
    const cat = resolvedCategory(e);
    minutesByCategory.set(cat, (minutesByCategory.get(cat) ?? 0) + e.duration_minutes);
  }
  return Array.from(minutesByCategory.entries())
    .map(([name, minutes]) => ({ name, value: toHours(minutes) }))
    .sort((a, b) => b.value - a.value);
}
