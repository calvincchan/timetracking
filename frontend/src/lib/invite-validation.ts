import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailConflict = "profile_exists" | "invite_exists" | null;

export async function checkEmailConflict(
  email: string,
  supabase: SupabaseClient
): Promise<EmailConflict> {
  const { data: hasProfile } = await supabase.rpc("email_has_profile", {
    p_email: email,
  });
  if (hasProfile) return "profile_exists";

  const { data: invite } = await supabase
    .from("invites")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (invite) return "invite_exists";

  return null;
}
