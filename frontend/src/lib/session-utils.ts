import type { Session } from "@supabase/supabase-js";

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
}

/** Returns the `user_role` claim injected by `custom_access_token_hook`, or null. */
export function getSessionUserRole(session: Session | null): string | null {
  if (!session) return null;
  const payload = decodeJwtPayload(session.access_token);
  return (payload.user_role as string) ?? null;
}
