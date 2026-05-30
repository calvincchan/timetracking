import type { badgeVariants } from "@/components/ui/badge";
import type { Enums } from "@/types/database";
import type { VariantProps } from "class-variance-authority";

export type UserRole = Enums<"user_role">;

export const ROLE_VARIANT: Record<UserRole, VariantProps<typeof badgeVariants>["variant"]> = {
  Supervisor: "default",
  Member: "secondary",
};
