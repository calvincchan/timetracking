import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  categoryName,
  formatDuration,
  groupEntriesByDay,
  shiftWeek,
  startOfWeek,
  sumMinutes,
  truncateNote,
  weekRangeFilters,
  type DayGroup,
  type WeekEntry,
} from "@/lib/week-utils";
import { useDelete, useList } from "@refinedev/core";
import { parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { LogTimeDialog } from "./log-time-dialog";

const NOTE_MAX_LENGTH = 80;

function EntryRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: WeekEntry;
  onEdit: (entry: WeekEntry) => void;
  onDelete: (entry: WeekEntry) => void;
}) {
  const note = entry.note.trim();
  return (
    <div className={cn("flex items-baseline gap-4 py-2", entry.is_locked && "opacity-60")}>
      <span className="w-20 shrink-0 font-medium tabular-nums">
        {formatDuration(entry.duration_minutes)}
      </span>
      <span className="w-40 shrink-0 text-muted-foreground">
        {categoryName(entry)}
      </span>
      <span className="flex-1 truncate" title={note || undefined}>
        {note ? truncateNote(note, NOTE_MAX_LENGTH) : ""}
      </span>
      {entry.is_locked ? (
        <div className="flex shrink-0 items-center px-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Lock className="size-3.5 text-muted-foreground" aria-label="Locked entry" />
            </TooltipTrigger>
            <TooltipContent>
              Locked — contact your Supervisor to make changes.
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Edit entry"
            onClick={() => onEdit(entry)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            aria-label="Delete entry"
            onClick={() => onDelete(entry)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function DaySection({
  day,
  onEdit,
  onDelete,
  onAddEntry,
}: {
  day: DayGroup;
  onEdit: (entry: WeekEntry) => void;
  onDelete: (entry: WeekEntry) => void;
  onAddEntry: (dateISO: string) => void;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
        <span>{day.label}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={`Add entry for ${day.label}`}
          onClick={() => onAddEntry(day.dateISO)}
        >
          <Plus className="size-3.5" />
        </Button>
        <span className="tabular-nums">{formatDuration(sumMinutes(day.entries))}</span>
      </h2>
      {day.entries.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground italic">No entries</p>
      ) : (
        <div className="divide-y">
          {day.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
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
  const [logDate, setLogDate] = useState<Date | null>(null);
  const [editEntry, setEditEntry] = useState<WeekEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<WeekEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { mutate: deleteTimeEntry } = useDelete();

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

  const weeklyTotal = useMemo(
    () => sumMinutes(result?.data ?? []),
    [result?.data],
  );

  function handleConfirmDelete() {
    if (!deleteEntry) return;
    setDeleting(true);
    deleteTimeEntry(
      {
        resource: "time_entries",
        id: deleteEntry.id,
        successNotification: false,
      },
      {
        onSuccess: () => {
          setDeleteEntry(null);
        },
        onSettled: () => setDeleting(false),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6  max-w-4xl">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Week</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setLogDate(new Date())}>
            <Plus className="mr-1 size-4" />
            Log Time
          </Button>
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
          {weekStart.getTime() !== startOfWeek(new Date()).getTime() && (
            <Button
              variant="outline"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Today
            </Button>
          )}
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

      <div className="flex items-baseline justify-between rounded-lg border px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">Weekly total</span>
        <span className="text-lg font-semibold tabular-nums">{formatDuration(weeklyTotal)}</span>
      </div>

      <div className={cn("flex flex-col gap-4", query.isLoading && "opacity-60")}>
        {days.map((day) => (
          <DaySection
            key={day.dateISO}
            day={day}
            onEdit={setEditEntry}
            onDelete={setDeleteEntry}
            onAddEntry={(dateISO) => setLogDate(parseISO(dateISO))}
          />
        ))}
      </div>

      {logDate && (
        <LogTimeDialog
          initialDate={logDate}
          onOpenChange={(open) => { if (!open) setLogDate(null); }}
        />
      )}

      {editEntry && (
        <LogTimeDialog
          entry={editEntry}
          onOpenChange={(open) => {
            if (!open) setEditEntry(null);
          }}
        />
      )}

      <AlertDialog
        open={!!deleteEntry}
        onOpenChange={(open) => {
          if (!open) setDeleteEntry(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The entry will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
