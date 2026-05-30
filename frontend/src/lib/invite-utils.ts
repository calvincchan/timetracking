import { supabaseClient } from "@/providers/supabase-client";

/** Returns null if the email can be invited, error message string otherwise. */
export async function checkEmailInvitable(email: string): Promise<string | null> {
  const { data, error } = await supabaseClient.rpc("is_email_invitable", {
    p_email: email,
  });

  if (error) return error.message;
  if (!data) return "This email is already registered.";
  return null;
}
