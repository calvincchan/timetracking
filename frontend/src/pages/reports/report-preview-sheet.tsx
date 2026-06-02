import { Fragment } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { buildGroupedDetailRows, buildSummaryRows, toHours } from "@/lib/report-preview";
import { parseTimeEntrySnapshot } from "@/types/report-snapshot";
import type { ReportRow } from "./list";

interface ReportPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportRow;
}

export function ReportPreviewSheet({
  open,
  onOpenChange,
  report,
}: ReportPreviewSheetProps) {
  const entries = parseTimeEntrySnapshot(report.time_entries_snapshot);
  const summaryRows = buildSummaryRows(entries);
  const detailGroups = buildGroupedDetailRows(entries);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[640px] sm:max-w-[640px] overflow-y-auto p-4">
        <SheetHeader>
          <SheetTitle>
            Report: {report.period_start} — {report.period_end}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 mt-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Summary</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-1 pr-4 font-medium">User</th>
                  <th className="py-1 pr-4 font-medium">Category</th>
                  <th className="py-1 font-medium text-right">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.length > 0 ? summaryRows.map((row) => (
                  <tr key={`${row.user}\0${row.category}`} className="border-b last:border-0">
                    <td className="py-1 pr-4">{row.user}</td>
                    <td className="py-1 pr-4">{row.category}</td>
                    <td className="py-1 text-right tabular-nums">{row.totalHours}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="py-2 text-muted-foreground italic text-center">
                      No entries
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-2">Details</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-1 pr-4 font-medium">Date</th>
                  <th className="py-1 pr-4 font-medium">Category</th>
                  <th className="py-1 pr-4 font-medium text-right">Duration</th>
                  <th className="py-1 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {detailGroups.length > 0 ? detailGroups.map((group) => (
                  <Fragment key={group.user}>
                    <tr className="border-b bg-muted/40">
                      <td colSpan={4} className="py-1 font-semibold">{group.user}</td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.entry_id} className="border-b last:border-0">
                        <td className="py-1 pr-4 tabular-nums">{row.entry_date}</td>
                        <td className="py-1 pr-4">{row.category_name}</td>
                        <td className="py-1 pr-4 text-right tabular-nums">
                          {toHours(row.duration_minutes)}h
                        </td>
                        <td className="py-1 text-muted-foreground">{row.note}</td>
                      </tr>
                    ))}
                  </Fragment>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-2 text-muted-foreground italic text-center">
                      No entries
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
