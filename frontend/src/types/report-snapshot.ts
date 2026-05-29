export interface TimeEntrySnapshot {
  entry_id:         string;
  user_id:          string;
  entry_date:       string; // yyyy-mm-dd
  duration_minutes: number;
  category_id:      string;
  note:             string;
}
// usage: report.time_entries_snapshot as TimeEntrySnapshot[]
