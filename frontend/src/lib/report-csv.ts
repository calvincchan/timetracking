import type { Json } from "@/types/database";

type SnapshotEntry = {
  entry_id: string;
  entry_date: string;
  duration_minutes: number;
  note: string;
  user_id: string;
  user_full_name: string;
  category_id: string | null;
  category_name: string | null;
};

function isSnapshotEntry(v: unknown): v is SnapshotEntry {
  return (
    typeof v === "object" &&
    v !== null &&
    "entry_id" in v &&
    "entry_date" in v &&
    "duration_minutes" in v
  );
}

function toSnapshotEntries(snapshot: Json): SnapshotEntry[] {
  if (!Array.isArray(snapshot)) return [];
  return snapshot.filter(isSnapshotEntry);
}

function escapeCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(...cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCell).join(",");
}

export function buildReportCsv(snapshot: Json): string {
  const entries = toSnapshotEntries(snapshot);
  const lines: string[] = [];

  const toHours = (minutes: number) =>
    Math.round((minutes / 60) * 100) / 100;

  // Summary block
  lines.push(row("User", "Category", "Total Hours"));

  const summaryMap = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.user_full_name}\0${e.category_name ?? ""}`;
    summaryMap.set(key, (summaryMap.get(key) ?? 0) + e.duration_minutes);
  }
  for (const [key, total] of summaryMap) {
    const [user, category] = key.split("\0");
    lines.push(row(user, category, toHours(total)));
  }

  // Blank separator
  lines.push("");

  // Detail block
  lines.push(row("Date", "User", "Category", "Duration (hours)", "Note"));
  for (const e of entries) {
    lines.push(
      row(e.entry_date, e.user_full_name, e.category_name, toHours(e.duration_minutes), e.note)
    );
  }

  return lines.join("\n");
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
