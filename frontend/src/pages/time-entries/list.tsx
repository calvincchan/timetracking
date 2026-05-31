import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  categoryName,
  formatDuration,
  groupEntriesByDay,
  shiftWeek,
  startOfWeek,
  truncateNote,
  weekRangeFilters,
  type DayGroup,
  type WeekEntry,
} from "@/lib/week-utils";
import { useList } from "@refinedev/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const NOTE_MAX_LENGTH = 80;

function EntryRow({ entry }: { entry: WeekEntry }) {
  const note = entry.note.trim();
  return (
    <div className="flex items-baseline gap-4 py-2">
      <span className="w-20 shrink-0 font-medium tabular-nums">
        {formatDuration(entry.duration_minutes)}
      </span>
      <span className="w-40 shrink-0 text-muted-foreground">
        {categoryName(entry)}
      </span>
      <span className="flex-1 truncate" title={note || undefined}>
        {note ? truncateNote(note, NOTE_MAX_LENGTH) : ""}
      </span>
    </div>
  );
}

function DaySection({ day }: { day: DayGroup }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {day.label}
      </h2>
      {day.entries.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground italic">No entries</p>
      ) : (
        <div className="divide-y">
          {day.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

export function MemberWeekView() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date()),
  );

  const filters = useMemo(() => weekRangeFilters(weekStart), [weekStart]);

  const { result, query } = useList<WeekEntry>({
    resource: "time_entries",
    filters,
    sorters: [{ field: "entry_date", order: "asc" }],
    pagination: { mode: "off" },
    meta: { select: "*, category:categories(name)" },
  });

  const days = useMemo(
    () => groupEntriesByDay(result?.data ?? [], weekStart),
    [result?.data, weekStart],
  );

  const rangeLabel = useMemo(() => {
    const first = days[0];
    const last = days[days.length - 1];
    return `${first.label} – ${last.label}`;
  }, [days]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Week</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous week"
            onClick={() => setWeekStart((d) => shiftWeek(d, -1))}
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-64 text-center text-sm text-muted-foreground">
            {rangeLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            onClick={() => setWeekStart((d) => shiftWeek(d, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </header>

      <div className={cn("flex flex-col gap-4", query.isLoading && "opacity-60")}>
        {days.map((day) => (
          <DaySection key={day.dateISO} day={day} />
        ))}
      </div>
    </div>
  );
}
