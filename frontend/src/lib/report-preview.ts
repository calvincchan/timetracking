import type { TimeEntrySnapshot } from "@/types/report-snapshot";

export type SummaryRow = {
  user: string;
  category: string;
  totalHours: number;
};

export type DetailRow = {
  entry_date: string;
  user_full_name: string;
  category_name: string;
  duration_minutes: number;
  note: string;
};

export const toHours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

export function buildSummaryRows(entries: TimeEntrySnapshot[]): SummaryRow[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.user_full_name}\0${e.category_name}`;
    map.set(key, (map.get(key) ?? 0) + e.duration_minutes);
  }
  return Array.from(map.entries())
    .map(([key, total]) => {
      const [user, category] = key.split("\0");
      return { user, category, totalHours: toHours(total) };
    })
    .sort((a, b) => a.user.localeCompare(b.user) || a.category.localeCompare(b.category));
}

export function buildDetailRows(entries: TimeEntrySnapshot[]): DetailRow[] {
  return [...entries]
    .sort(
      (a, b) =>
        a.entry_date.localeCompare(b.entry_date) ||
        a.user_full_name.localeCompare(b.user_full_name),
    )
    .map((e) => ({
      entry_date: e.entry_date,
      user_full_name: e.user_full_name,
      category_name: e.category_name,
      duration_minutes: e.duration_minutes,
      note: e.note,
    }));
}
