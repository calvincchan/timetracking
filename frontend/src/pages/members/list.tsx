import { EmptyCell } from "@/components/refine-ui/empty-cell";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import {
  ListView,
  ListViewHeader,
} from "@/components/refine-ui/views/list-view";
import { Badge } from "@/components/ui/badge";
import { ROLE_VARIANT } from "@/constants/role-badge";
import type { Tables } from "@/types/database";
import type { HttpError } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";

// View columns are all nullable in the generated types; id is always present in practice.
type MemberRow = Omit<Tables<"members">, "id"> & { id?: string };

const columnHelper = createColumnHelper<MemberRow>();

const columns = [
  columnHelper.accessor("full_name", {
    header: "Name",
    size: 240,
    cell: ({ getValue }) => getValue() ?? <EmptyCell />,
  }),
  columnHelper.accessor("role", {
    header: "Role",
    size: 140,
    cell: ({ getValue }) => {
      const role = getValue();
      if (!role) return <EmptyCell />;
      return <Badge variant={ROLE_VARIANT[role]}>{role}</Badge>;
    },
  }),
  columnHelper.accessor("email", {
    header: "Email",
    size: 280,
    cell: ({ getValue }) => getValue() ?? <EmptyCell />,
  }),
  columnHelper.accessor("created_at", {
    header: "Joined",
    size: 160,
    cell: ({ getValue }) => {
      const val = getValue();
      return val ? new Date(val).toLocaleDateString() : <EmptyCell />;
    },
  }),
];

export function MemberList() {
  const table = useTable<MemberRow, HttpError>({
    columns,
    refineCoreProps: {
      resource: "members",
      sorters: {
        initial: [{ field: "full_name", order: "asc" }],
      },
    },
  });

  return (
    <ListView className="p-6">
      <ListViewHeader />
      <DataTable table={table} />
    </ListView>
  );
}
