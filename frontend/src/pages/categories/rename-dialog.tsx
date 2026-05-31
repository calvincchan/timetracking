import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkCategoryNameAvailable } from "@/lib/category-utils";
import type { Tables } from "@/types/database";
import { useUpdate } from "@refinedev/core";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type CategoryRow = Tables<"categories">;

type RenameForm = { name: string };

export function CategoryRenameDialog({
  category,
  onOpenChange,
}: {
  category: CategoryRow;
  onOpenChange: (open: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const { mutate } = useUpdate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RenameForm>({
    defaultValues: { name: category.name },
  });

  const onSubmit = handleSubmit((values) => {
    setSaving(true);
    mutate(
      {
        resource: "categories",
        id: category.id,
        values: { name: values.name },
        successNotification: false,
      },
      {
        onSuccess: () => {
          toast.success("Category renamed.", { richColors: true });
          onOpenChange(false);
        },
        onSettled: () => setSaving(false),
      },
    );
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>
              The new name applies everywhere this category is used, including
              historical time entries.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5 py-4">
            <Label htmlFor="rename-name">Name *</Label>
            <Input
              id="rename-name"
              type="text"
              {...register("name", {
                required: "Name is required",
                validate: async (value) => {
                  if (!value?.trim()) return true;
                  return (
                    (await checkCategoryNameAvailable(value, category.id)) ??
                    true
                  );
                },
                setValueAs: (value: string) => value.trim(),
              })}
              placeholder="Development"
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message as string}
              </p>
            )}
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
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
