import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_HOURS,
  DEFAULT_MINUTES,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  calcDurationMinutes,
  resolveInitialHoursMinutes,
  resolveMinutes,
  validateDuration,
} from "@/lib/log-time-utils";
import { cn } from "@/lib/utils";
import { formatDateISO } from "@/lib/week-utils";
import type { Tables } from "@/types/database";
import { useCreate, useGetIdentity, useList, useUpdate } from "@refinedev/core";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type CategoryRow = Tables<"categories">;
type TimeEntry = Tables<"time_entries">;

type LogTimeForm = {
  date: Date;
  hours: number;
  minutes: number;
  category_id: string | null;
  note: string;
};

const NOTE_MAX_LENGTH = 500;

export function LogTimeDialog({
  entry,
  onOpenChange,
}: {
  entry?: TimeEntry;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = entry !== undefined;
  const [saving, setSaving] = useState(false);
  const { mutate: createEntry } = useCreate();
  const { mutate: updateEntry } = useUpdate();
  const { data: identity } = useGetIdentity<{ id: string }>();

  // Active (non-archived) categories
  const { result: categoryResult, query: categoryQuery } = useList<CategoryRow>({
    resource: "categories",
    filters: [{ field: "is_archived", operator: "eq", value: false }],
    sorters: [{ field: "name", order: "asc" }],
    pagination: { mode: "off" },
  });

  const activeCategories = categoryResult?.data ?? [];

  // When editing, also fetch the entry's category if it's archived (won't appear above)
  const entryHasCategory = isEdit && !!entry.category_id;
  const { result: archivedCatResult } = useList<CategoryRow>({
    resource: "categories",
    filters: entryHasCategory
      ? [{ field: "id", operator: "eq", value: entry.category_id }]
      : [{ field: "id", operator: "eq", value: "00000000-0000-0000-0000-000000000000" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: isEdit },
  });

  const entryCategory = archivedCatResult?.data?.[0] ?? null;
  // Show the archived category if it's not in the active list
  const archivedEntry =
    entryCategory && !activeCategories.some((c) => c.id === entryCategory.id)
      ? entryCategory
      : null;

  const noCategories =
    !categoryQuery.isLoading && activeCategories.length === 0 && !archivedEntry;

  const initialValues = (): LogTimeForm => {
    if (!isEdit) {
      return {
        date: new Date(),
        hours: DEFAULT_HOURS,
        minutes: DEFAULT_MINUTES,
        category_id: null,
        note: "",
      };
    }
    const { hours, minutes } = resolveInitialHoursMinutes(entry.duration_minutes);
    return {
      date: parseISO(entry.entry_date),
      hours,
      minutes,
      category_id: entry.category_id ?? null,
      note: entry.note ?? "",
    };
  };

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LogTimeForm>({
    defaultValues: initialValues(),
  });

  const watchedHours = watch("hours");
  const watchedNote = watch("note");
  const isMaxHours = watchedHours === 24;

  const onSubmit = handleSubmit((values) => {
    if (!identity?.id) return;

    const effectiveMinutes = resolveMinutes(values.hours, values.minutes);
    const duration_minutes = calcDurationMinutes(values.hours, effectiveMinutes);

    setSaving(true);

    if (isEdit) {
      updateEntry(
        {
          resource: "time_entries",
          id: entry.id,
          values: {
            entry_date: formatDateISO(values.date),
            duration_minutes,
            category_id: values.category_id ?? null,
            note: values.note.trim(),
          },
          successNotification: false,
        },
        {
          onSuccess: () => {
            toast.success("Time entry updated.", { richColors: true });
            onOpenChange(false);
          },
          onSettled: () => setSaving(false),
        },
      );
    } else {
      createEntry(
        {
          resource: "time_entries",
          values: {
            entry_date: formatDateISO(values.date),
            duration_minutes,
            category_id: values.category_id ?? null,
            note: values.note.trim(),
            user_id: identity.id,
            is_locked: false,
          },
          successNotification: false,
        },
        {
          onSuccess: () => {
            toast.success("Time entry logged.", { richColors: true });
            onOpenChange(false);
          },
          onSettled: () => setSaving(false),
        },
      );
    }
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Time Entry" : "Log Time"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label>Date *</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(day) => field.onChange(day ?? new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Duration *</Label>
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="hours"
                  render={({ field }) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOUR_OPTIONS.map((h) => (
                          <SelectItem key={h} value={String(h)}>
                            {h}h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Controller
                  control={control}
                  name="minutes"
                  rules={{
                    validate: (minutesValue, formValues) => {
                      const err = validateDuration(
                        formValues.hours,
                        resolveMinutes(formValues.hours, minutesValue),
                      );
                      return err ?? true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={String(isMaxHours ? 0 : field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={isMaxHours}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MINUTE_OPTIONS.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {m}m
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {errors.minutes && (
                <p className="text-sm text-destructive">
                  {errors.minutes.message as string}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || null)}
                      disabled={noCategories || categoryQuery.isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Uncategorized" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                        {archivedEntry && (
                          <SelectItem
                            key={archivedEntry.id}
                            value={archivedEntry.id}
                            disabled
                            className="text-muted-foreground"
                          >
                            {archivedEntry.name} (archived)
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {noCategories && (
                      <p className="text-sm text-muted-foreground">
                        No categories available — ask your Supervisor
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="log-time-note">Note</Label>
              <Controller
                control={control}
                name="note"
                rules={{
                  maxLength: {
                    value: NOTE_MAX_LENGTH,
                    message: `Note must be at most ${NOTE_MAX_LENGTH} characters.`,
                  },
                }}
                render={({ field }) => (
                  <Textarea
                    id="log-time-note"
                    placeholder="Optional note…"
                    maxLength={NOTE_MAX_LENGTH}
                    {...field}
                  />
                )}
              />
              <p className="text-right text-xs text-muted-foreground">
                {watchedNote.length}/{NOTE_MAX_LENGTH}
              </p>
              {errors.note && (
                <p className="text-sm text-destructive">
                  {errors.note.message as string}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {isEdit ? "Save Changes" : "Log Time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
