import { checkEmailAllowed } from "@/lib/invite-check";
import { supabaseClient } from "@/providers/supabase-client";

/** Returns null on success, error message string on failure. */
export async function requestOtp(email: string): Promise<string | null> {
  const inviteError = await checkEmailAllowed(email);
  if (inviteError) return inviteError;

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  return error ? error.message : null;
}
