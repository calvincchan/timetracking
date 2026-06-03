import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useList } from "@refinedev/core";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useSearchParams } from "react-router";

type MemberRow = { id: string; full_name: string };

type Preset = "this-week" | "last-week" | "this-month" | "last-month" | "custom";

const WEEK_OPTS = { weekStartsOn: 0 as const };
const SELECT_ALL = "__all__";

function getPresetRange(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "this-week":
      return {
        from: format(startOfWeek(today, WEEK_OPTS), "yyyy-MM-dd"),
        to: format(endOfWeek(today, WEEK_OPTS), "yyyy-MM-dd"),
      };
    case "last-week": {
      const d = subWeeks(today, 1);
      return {
        from: format(startOfWeek(d, WEEK_OPTS), "yyyy-MM-dd"),
        to: format(endOfWeek(d, WEEK_OPTS), "yyyy-MM-dd"),
      };
    }
    case "this-month":
      return {
        from: format(startOfMonth(today), "yyyy-MM-dd"),
        to: format(endOfMonth(today), "yyyy-MM-dd"),
      };
    case "last-month": {
      const d = subMonths(today, 1);
      return {
        from: format(startOfMonth(d), "yyyy-MM-dd"),
        to: format(endOfMonth(d), "yyyy-MM-dd"),
      };
    }
  }
}

function detectPreset(from: string, to: string): Preset {
  const named: Exclude<Preset, "custom">[] = [
    "this-week",
    "last-week",
    "this-month",
    "last-month",
  ];
  for (const p of named) {
    const r = getPresetRange(p);
    if (r.from === from && r.to === to) return p;
  }
  return "custom";
}

const PRESET_LABELS: Record<Preset, string> = {
  "this-week": "This Week",
  "last-week": "Last Week",
  "this-month": "This Month",
  "last-month": "Last Month",
  custom: "Custom",
};

export function AnalyticsFilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customOpen, setCustomOpen] = useState(false);

  const { defaultFrom, defaultTo } = useMemo(() => ({
    defaultFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    defaultTo: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  }), []);

  const rawFrom = searchParams.get("from") ?? defaultFrom;
  const rawTo = searchParams.get("to") ?? defaultTo;

  const isValidDateStr = (s: string) => !isNaN(new Date(s + "T00:00:00").getTime());
  const from = isValidDateStr(rawFrom) ? rawFrom : defaultFrom;
  const to = isValidDateStr(rawTo) ? rawTo : defaultTo;

  const userId = searchParams.get("user_id") ?? "";

  const activePreset = useMemo(() => detectPreset(from, to), [from, to]);

  const { result: membersResult } = useList<MemberRow>({
    resource: "members",
    pagination: { pageSize: 200 },
    sorters: [{ field: "full_name", order: "asc" }],
  });
  const members = membersResult?.data ?? [];

  function applyPreset(preset: Exclude<Preset, "custom">) {
    const range = getPresetRange(preset);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("from", range.from);
      next.set("to", range.to);
      return next;
    });
  }

  function handleCustomRange(range: DateRange | undefined) {
    if (!range?.from) return;
    const fromStr = format(range.from, "yyyy-MM-dd");
    const toStr = range.to ? format(range.to, "yyyy-MM-dd") : fromStr;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("from", fromStr);
      next.set("to", toStr);
      return next;
    });
    if (range.to) setCustomOpen(false);
  }

  function handleMember(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value && value !== SELECT_ALL) {
        next.set("user_id", value);
      } else {
        next.delete("user_id");
      }
      return next;
    });
  }

  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T00:00:00");

  const customCalendarRange: DateRange | undefined =
    activePreset === "custom"
      ? { from: fromDate, to: toDate }
      : undefined;

  const customLabel =
    activePreset === "custom"
      ? `${format(fromDate, "MMM d")} – ${format(toDate, "MMM d")}`
      : "Custom";

  const selectValue = userId || SELECT_ALL;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        {(["this-week", "last-week", "this-month", "last-month"] as const).map((preset) => (
          <Button
            key={preset}
            variant={activePreset === preset ? "default" : "outline"}
            size="sm"
            onClick={() => applyPreset(preset)}
          >
            {PRESET_LABELS[preset]}
          </Button>
        ))}

        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={activePreset === "custom" ? "default" : "outline"}
              size="sm"
            >
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
              {customLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={customCalendarRange}
              onSelect={handleCustomRange}
              numberOfMonths={2}
              weekStartsOn={0}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Select value={selectValue} onValueChange={handleMember}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Members" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SELECT_ALL}>All Members</SelectItem>
          {members.map((m) => (
            <SelectItem key={String(m.id)} value={String(m.id)}>
              {String(m.full_name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
