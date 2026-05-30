import { Input } from "@/components/ui/input";
import { normalizeEmail } from "@/lib/email-utils";
import React from "react";

export function EmailInput({
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const normalized = normalizeEmail(e.target.value);
    e.target.value = normalized;
    onChange?.(e);
  }

  return <Input inputMode="email" onChange={handleChange} {...props} />;
}
