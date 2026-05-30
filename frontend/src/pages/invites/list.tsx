import { EmptyCell } from "@/components/refine-ui/empty-cell";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import {
  ListView,
  ListViewHeader,
} from "@/components/refine-ui/views/list-view";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_VARIANT } from "@/constants/role-badge";
import type { Tables } from "@/types/database";
import { useDelete, type HttpError } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type InviteRow = Tables<"invites">;

const columnHelper = createColumnHelper<InviteRow>();

function ActionsCell({
  invite,
  onRequestDelete,
}: {
  invite: InviteRow;
  onRequestDelete: (target: { id: string; email: string }) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onRequestDelete({ id: invite.id, email: invite.email })}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InviteList() {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const { mutate: deleteInvite } = useDelete();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteInvite(
      {
        resource: "invites",
        id: deleteTarget.id,
        successNotification: false,
      },
      {
        onSuccess: () => {
          toast.success("Invite deleted.", { richColors: true });
          setDeleteTarget(null);
        },
      }
    );
  };

  const columns = [
    columnHelper.accessor("full_name", {
      header: "Full Name",
      size: 200,
    }),
    columnHelper.accessor("email", {
      header: "Email",
      size: 280,
    }),
    columnHelper.accessor("role", {
      header: "Role",
      size: 140,
      cell: ({ getValue }) => {
        const role = getValue();
        return <Badge variant={ROLE_VARIANT[role]}>{role}</Badge>;
      },
    }),
    columnHelper.accessor("created_at", {
      header: "Invited",
      size: 160,
      cell: ({ getValue }) => {
        const val = getValue();
        return val ? new Date(val).toLocaleDateString() : <EmptyCell />;
      },
    }),
    columnHelper.display({
      id: "actions",
      size: 80,
      cell: ({ row }) => (
        <div className="action-column">
          <ActionsCell
            invite={row.original}
            onRequestDelete={setDeleteTarget}
          />
        </div>
      ),
    }),
  ];

  const table = useTable<InviteRow, HttpError>({
    columns,
    refineCoreProps: {
      resource: "invites",
    },
  });

  return (
    <ListView className="p-6">
      <ListViewHeader />
      <DataTable table={table} />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invite?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the invite for{" "}
              <strong>{deleteTarget?.email}</strong>. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListView>
  );
}
