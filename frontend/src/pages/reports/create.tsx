import {
  CreateView,
  CreateViewHeader,
} from "@/components/refine-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/providers/supabase-client";
import type { Tables } from "@/types/database";
import { useList } from "@refinedev/core";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type Profile = Tables<"profiles">;
type Category = Tables<"categories">;

function DatePickerField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  disabled?: (d: Date) => boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              onChange(d);
              setOpen(false);
            }}
            disabled={disabled}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ReportCreate() {
  const navigate = useNavigate();
  const [periodStart, setPeriodStart] = useState<Date | undefined>();
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>();
  const [userId, setUserId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [previewCount, setPreviewCount] = useState<{ entry_count: number; member_count: number } | null>(null);
  const [dateError, setDateError] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const { result: profilesResult } = useList<Profile>({
    resource: "profiles",
    pagination: { pageSize: 200 },
    sorters: [{ field: "full_name", order: "asc" }],
  });
  const { result: categoriesResult } = useList<Category>({
    resource: "categories",
    pagination: { pageSize: 200 },
    filters: [{ field: "is_archived", operator: "eq", value: false }],
    sorters: [{ field: "name", order: "asc" }],
  });

  const profiles = profilesResult?.data ?? [];
  const categories = categoriesResult?.data ?? [];

  useEffect(() => {
    if (!periodStart || !periodEnd) {
      setPreviewCount(null);
      setDateError("");
      return;
    }
    if (periodEnd < periodStart) {
      setDateError("End date must be on or after start date.");
      setPreviewCount(null);
      return;
    }
    setDateError("");

    let cancelled = false;
    supabaseClient
      .rpc("preview_report", {
        period_start: format(periodStart, "yyyy-MM-dd"),
        period_end: format(periodEnd, "yyyy-MM-dd"),
        ...(userId !== "all" ? { user_id: userId } : {}),
        ...(categoryId !== "all" ? { category_id: categoryId } : {}),
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(error);
          return;
        }
        const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
        setPreviewCount(row ?? { entry_count: 0, member_count: 0 });
      });

    return () => {
      cancelled = true;
    };
  }, [periodStart, periodEnd, userId, categoryId]);

  const entryCount = previewCount?.entry_count ?? 0;

  async function handleGenerate() {
    if (!periodStart || !periodEnd || entryCount === 0) return;
    setGenerating(true);
    try {
      const { error: rpcError } = await supabaseClient.rpc("generate_report", {
        period_start: format(periodStart, "yyyy-MM-dd"),
        period_end: format(periodEnd, "yyyy-MM-dd"),
        ...(userId !== "all" ? { user_id: userId } : {}),
        ...(categoryId !== "all" ? { category_id: categoryId } : {}),
      });
      if (rpcError) throw rpcError;

      toast.success("Report generated successfully.", { richColors: true });
      navigate("/reports");
    } catch (e) {
      toast.error("Failed to generate report.", { richColors: true });
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate =
    !!periodStart &&
    !!periodEnd &&
    !dateError &&
    entryCount > 0 &&
    !generating;

  return (
    <CreateView className="p-6 max-w-lg">
      <CreateViewHeader title="Generate Report" />

      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DatePickerField
            label="Period Start *"
            value={periodStart}
            onChange={setPeriodStart}
          />
          <DatePickerField
            label="Period End *"
            value={periodEnd}
            onChange={setPeriodEnd}
            disabled={periodStart ? (d) => d < periodStart : undefined}
          />
          {dateError && (
            <p className="text-sm text-destructive">{dateError}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters (optional)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Member</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {previewCount !== null && !dateError && (
        <p className="text-sm text-muted-foreground">
          {entryCount === 0
            ? "No entries match the selected filters."
            : `${entryCount} ${entryCount === 1 ? "entry" : "entries"} across ${previewCount.member_count} ${previewCount.member_count === 1 ? "member" : "members"}.`}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={!canGenerate}>
          {generating ? "Generating…" : "Generate & Download"}
        </Button>
      </div>
    </CreateView>
  );
}
