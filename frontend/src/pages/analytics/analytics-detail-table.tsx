import { DataTablePagination } from "@/components/refine-ui/data-table/data-table-pagination";
import { EmptyCell } from "@/components/refine-ui/empty-cell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toHours } from "@/lib/report-preview";
import { cn } from "@/lib/utils";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type SortingState,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnalyticsEntry } from "./analytics-utils";

const PAGE_SIZE = 50;

const columnHelper = createColumnHelper<AnalyticsEntry>();

function SortHeader<TData>({ column, label }: { column: Column<TData>; label: string }) {
  const sorted = column.getIsSorted();
  return (
    <button
      className="flex items-center gap-1 text-left font-medium"
      onClick={() => column.toggleSorting(undefined, false)}
    >
      {label}
      {sorted === "desc" ? (
        <ArrowDown className="text-primary !h-3 !w-3" />
      ) : sorted === "asc" ? (
        <ArrowUp className="text-primary !h-3 !w-3" />
      ) : (
        <ChevronsUpDown className="text-muted-foreground !h-3 !w-3" />
      )}
    </button>
  );
}

type Props = {
  entries: AnalyticsEntry[];
  isLoading: boolean;
  showMember: boolean;
};

export function AnalyticsDetailTable({ entries, isLoading, showMember }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "entry_date", desc: true },
  ]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const columns = useMemo(
    () => [
      columnHelper.accessor("entry_date", {
        id: "entry_date",
        header: ({ column }) => <SortHeader column={column} label="Date" />,
        cell: ({ getValue }) => format(parseISO(getValue()), "MMM d, yyyy"),
        size: 130,
      }),
      ...(showMember
        ? [
            columnHelper.accessor("user_full_name", {
              id: "user_full_name",
              header: ({ column }) => <SortHeader column={column} label="Member" />,
              cell: ({ getValue }) => getValue() || <EmptyCell />,
              size: 160,
            }),
          ]
        : []),
      columnHelper.accessor(
        (row) => (row.category_id === null ? "Uncategorized" : row.category_name),
        {
          id: "category",
          header: ({ column }) => <SortHeader column={column} label="Category" />,
          cell: ({ getValue }) => getValue(),
          size: 150,
        }
      ),
      columnHelper.accessor("duration_minutes", {
        id: "duration_minutes",
        header: ({ column }) => <SortHeader column={column} label="Duration" />,
        cell: ({ getValue }) => `${toHours(getValue())} h`,
        size: 110,
      }),
      columnHelper.accessor("note", {
        id: "note",
        header: "Note",
        cell: ({ getValue }) => {
          const v = getValue();
          return v ? v : <EmptyCell />;
        },
        enableSorting: false,
        size: 9999,
      }),
    ],
    [showMember]
  );

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPageIndex(0);
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  const rows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const currentPage = pageIndex + 1;

  return (
    <div className={cn("flex", "flex-col", "gap-4")}>
      <div className={cn("rounded-md", "border")}>
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} aria-hidden="true">
                  {table.getAllLeafColumns().map((col) => (
                    <TableCell key={col.id} style={{ width: col.getSize() }}>
                      <div className="h-8" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <TableRow key={row.original.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                      <div className="truncate">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="text-center text-muted-foreground"
                  style={{ height: "120px" }}
                >
                  No entries for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!isLoading && rows.length > 0 && (
        <DataTablePagination
          currentPage={currentPage}
          pageCount={pageCount}
          setCurrentPage={(page) => setPageIndex(page - 1)}
          pageSize={pageSize}
          setPageSize={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          total={entries.length}
        />
      )}
    </div>
  );
}
