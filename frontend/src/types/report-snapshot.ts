import type { Json } from "./database";

export interface TimeEntrySnapshot {
  entry_id:         string;
  user_id:          string;
  user_full_name:   string;
  entry_date:       string; // yyyy-mm-dd
  duration_minutes: number;
  category_id:      string | null;
  category_name:    string;
  note:             string;
}

// Json's element type is too wide for a direct cast to TimeEntrySnapshot[].
// The double cast is required by TypeScript; the Array.isArray guard ensures
// the value is actually an array at runtime before we assert the element shape.
export function parseTimeEntrySnapshot(json: Json): TimeEntrySnapshot[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as TimeEntrySnapshot[];
}
