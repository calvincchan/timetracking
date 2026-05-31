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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  categoryArchivedFilters,
  checkCategoryNameAvailable,
} from "@/lib/category-utils";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";
import { useUpdate, type HttpError } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryRenameDialog } from "./rename-dialog";

type CategoryRow = Tables<"categories">;

const columnHelper = createColumnHelper<CategoryRow>();

function ActionsCell({
  category,
  onRename,
  onRequestArchive,
  onUnarchive,
}: {
  category: CategoryRow;
  onRename: (category: CategoryRow) => void;
  onRequestArchive: (category: CategoryRow) => void;
  onUnarchive: (category: CategoryRow) => void;
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
        {category.is_archived ? (
          <DropdownMenuItem onClick={() => onUnarchive(category)}>
            Unarchive
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => onRename(category)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRequestArchive(category)}>
              Archive
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CategoryList() {
  const [showArchived, setShowArchived] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CategoryRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CategoryRow | null>(null);
  const { mutate: updateCategory } = useUpdate();

  const handleArchive = () => {
    if (!archiveTarget) return;
    updateCategory(
      {
        resource: "categories",
        id: archiveTarget.id,
        values: { is_archived: true },
        successNotification: false,
      },
      {
        onSuccess: () => {
          toast.success("Category archived.", { richColors: true });
          setArchiveTarget(null);
        },
      },
    );
  };

  const handleUnarchive = async (category: CategoryRow) => {
    const conflict = await checkCategoryNameAvailable(category.name);
    if (conflict) {
      toast.error(
        `Cannot unarchive "${category.name}": an active category with this name already exists.`,
        { richColors: true },
      );
      return;
    }
    updateCategory(
      {
        resource: "categories",
        id: category.id,
        values: { is_archived: false },
        successNotification: false,
      },
      {
        onSuccess: () => {
          toast.success("Category unarchived.", { richColors: true });
        },
      },
    );
  };

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
    columnHelper.display({
      id: "actions",
      size: 80,
      cell: ({ row }) => (
        <div className="action-column">
          <ActionsCell
            category={row.original}
            onRename={setRenameTarget}
            onRequestArchive={setArchiveTarget}
            onUnarchive={handleUnarchive}
          />
        </div>
      ),
    }),
  ];

  const table = useTable<CategoryRow, HttpError>({
    columns,
    refineCoreProps: {
      resource: "categories",
      sorters: {
        initial: [{ field: "name", order: "asc" }],
      },
      filters: {
        initial: categoryArchivedFilters(false),
      },
    },
  });

  const handleShowArchivedChange = (checked: boolean) => {
    setShowArchived(checked);
    // `filters.initial` is only read on mount, so toggle the active filter set
    // directly. `replace` swaps the whole set rather than merging.
    table.refineCore.setFilters(categoryArchivedFilters(checked), "replace");
  };

  return (
    <ListView className="p-6">
      <ListViewHeader />
      <div className="flex items-center gap-2">
        <Switch
          id="show-archived"
          checked={showArchived}
          onCheckedChange={handleShowArchivedChange}
        />
        <Label htmlFor="show-archived">Show archived</Label>
      </div>
      <DataTable table={table} />

      {renameTarget && (
        <CategoryRenameDialog
          category={renameTarget}
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null);
          }}
        />
      )}

      <AlertDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Archive <strong>{archiveTarget?.name}</strong>? It will no longer
              appear in the entry form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListView>
  );
}
