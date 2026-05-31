import {
  CreateView,
  CreateViewHeader,
} from "@/components/refine-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkCategoryNameAvailable } from "@/lib/category-utils";
import { useForm } from "@refinedev/react-hook-form";

export function CategoryCreate() {
  const {
    register,
    saveButtonProps,
    formState: { errors },
  } = useForm({
    refineCoreProps: {
      resource: "categories",
      redirect: "list",
    },
    defaultValues: {
      name: "",
    },
  });

  return (
    <CreateView className="p-6 max-w-lg">
      <CreateViewHeader title="New Category" />

      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              {...register("name", {
                required: "Name is required",
                validate: async (value) => {
                  if (!value?.trim()) return true;
                  return (await checkCategoryNameAvailable(value)) ?? true;
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button {...saveButtonProps}>Create Category</Button>
      </div>
    </CreateView>
  );
}
