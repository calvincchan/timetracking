import { DataTable } from "@/components/refine-ui/data-table/data-table";
import {
  ListView,
  ListViewHeader,
} from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";
import { type HttpError } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";

type CategoryRow = Tables<"categories">;

const columnHelper = createColumnHelper<CategoryRow>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    size: 320,
    cell: ({ row, getValue }) => {
      const archived = row.original.is_archived;
      return (
        <div className="flex items-center gap-2">
          <span className={cn(archived && "text-muted-foreground")}>
            {getValue()}
          </span>
          {archived && <Badge variant="secondary">Archived</Badge>}
        </div>
      );
    },
  }),
];

export function CategoryList() {
  const [showArchived, setShowArchived] = useState(false);

  const table = useTable<CategoryRow, HttpError>({
    columns,
    refineCoreProps: {
      resource: "categories",
      sorters: {
        initial: [{ field: "name", order: "asc" }],
      },
      filters: {
        permanent: showArchived
          ? []
          : [{ field: "is_archived", operator: "eq", value: false }],
      },
    },
  });

  return (
    <ListView className="p-6">
      <ListViewHeader />
      <div className="flex items-center gap-2">
        <Switch
          id="show-archived"
          checked={showArchived}
          onCheckedChange={setShowArchived}
        />
        <Label htmlFor="show-archived">Show archived</Label>
      </div>
      <DataTable table={table} />
    </ListView>
  );
}
