import {
  CreateView,
  CreateViewHeader,
} from "@/components/refine-ui/views/create-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailInput } from "@/components/ui/email-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Constants } from "@/types/database";
import { useNavigation } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { supabaseClient } from "@/providers/supabase-client";
import { checkEmailConflict } from "@/lib/invite-validation";

const ROLE_OPTIONS = Constants.public.Enums.user_role;

export function InviteCreate() {
  const [otpError, setOtpError] = useState("");
  const { list } = useNavigation();

  const {
    register,
    control,
    handleSubmit,
    setError,
    saveButtonProps,
    formState: { errors },
    refineCore: { onFinish },
  } = useForm({
    refineCoreProps: {
      resource: "invites",
      redirect: false,
      onMutationSuccess: async (data) => {
        const email = data.data?.email as string;
        const { error } = await supabaseClient.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) {
          setOtpError(error.message);
        } else {
          list("invites");
        }
      },
    },
    defaultValues: {
      email: "",
      full_name: "",
      role: "Member" as (typeof ROLE_OPTIONS)[number],
    },
  });

  const wrappedOnFinish = async (values: Record<string, string>) => {
    const conflict = await checkEmailConflict(values.email, supabaseClient);
    if (conflict === "profile_exists") {
      setError("email", { message: "This email already has an account" });
      return;
    }
    if (conflict === "invite_exists") {
      setError("email", {
        message: "An invite is already pending for this email",
      });
      return;
    }
    return onFinish(values as Parameters<typeof onFinish>[0]);
  };

  return (
    <CreateView className="p-6 max-w-lg">
      <CreateViewHeader title="New Invite" />

      <Card>
        <CardHeader>
          <CardTitle>Invite Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              type="text"
              {...register("full_name", {
                required: "Full name is required",
              })}
              placeholder="Jane Smith"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">
                {errors.full_name.message as string}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email *</Label>
            <EmailInput
              id="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                  message: "Enter a valid email address",
                },
              })}
              placeholder="colleague@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message as string}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Role *</Label>
            <Controller
              name="role"
              control={control}
              rules={{ required: "Role is required" }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-destructive">
                {errors.role.message as string}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {otpError && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Invite saved, but the magic-link email could not be sent.</p>
          <p className="mt-1">{otpError}</p>
          <button
            type="button"
            onClick={() => list("invites")}
            className="mt-2 underline hover:no-underline"
          >
            Go to invites list →
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <Button {...saveButtonProps} onClick={handleSubmit(wrappedOnFinish)}>
          Send Invite
        </Button>
      </div>
    </CreateView>
  );
}
