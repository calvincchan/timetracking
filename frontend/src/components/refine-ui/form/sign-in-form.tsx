"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmailInput } from "@/components/ui/email-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/providers/supabase-client";
import { useLogin, useRefineOptions } from "@refinedev/core";

export const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const { title } = useRefineOptions();
  const { mutate: login } = useLogin();

  const handleSendOtp = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSendError("");

    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    setIsSending(false);

    if (error) {
      setSendError(error.message);
    } else {
      setStep("otp");
    }
  };

  const handleVerifyOtp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    login({ email, otp });
  };

  return (
    <div
      className={cn(
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
        "px-6",
        "py-8",
        "min-h-svh"
      )}
    >
      <div className={cn("flex", "items-center", "justify-center")}>
        {title.icon && (
          <div className={cn("text-primary", "[&>svg]:w-12", "[&>svg]:h-12")}>
            {title.icon}
          </div>
        )}
      </div>

      <Card className={cn("sm:w-[456px]", "p-12", "mt-6")}>
        <CardHeader className={cn("px-0")}>
          <CardTitle className={cn("text-primary", "text-3xl", "font-semibold")}>
            {step === "email" ? "Sign in" : "Check your inbox"}
          </CardTitle>
          <CardDescription className={cn("text-muted-foreground", "font-medium")}>
            {step === "email"
              ? "Enter your email to receive a one-time code."
              : `We sent a 6-digit code to ${email}.`}
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className={cn("px-0")}>
          {step === "email" ? (
            <form onSubmit={handleSendOtp}>
              <div className={cn("flex", "flex-col", "gap-2")}>
                <Label htmlFor="email">Email</Label>
                <EmailInput
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {sendError && (
                <p className={cn("mt-2", "text-sm", "text-destructive")}>
                  {sendError}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className={cn("w-full", "mt-6")}
                disabled={isSending}
              >
                {isSending ? "Sending…" : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className={cn("flex", "flex-col", "gap-2")}>
                <Label htmlFor="otp">One-time code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="6-10 digits"
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className={cn("w-full", "mt-6")}
              >
                Sign in
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setSendError("");
                }}
                className={cn(
                  "mt-4",
                  "w-full",
                  "text-sm",
                  "text-center",
                  "text-muted-foreground",
                  "hover:text-foreground",
                  "transition-colors"
                )}
              >
                ← Try a different email
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

SignInForm.displayName = "SignInForm";
