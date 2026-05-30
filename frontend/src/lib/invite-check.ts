import { supabaseClient } from "@/providers/supabase-client";

export async function checkEmailAllowed(email: string): Promise<string | null> {
  const { data, error } = await supabaseClient.rpc("is_email_allowed", {
    p_email: email,
  });

  if (error) return error.message;
  if (!data) return "You haven't been invited.";
  return null;
}
