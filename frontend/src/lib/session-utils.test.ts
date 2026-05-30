import { describe, expect, it } from "vitest";
import { getSessionUserRole } from "./session-utils";
import type { Session } from "@supabase/supabase-js";

/** Build a minimal session with a fake JWT whose payload contains `claims`. */
function makeSession(claims: Record<string, unknown>): Session {
  const payload = btoa(JSON.stringify(claims));
  return {
    access_token: `header.${payload}.sig`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 9999999999,
    refresh_token: "ref",
    user: { id: "user-1", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" },
  } as unknown as Session;
}

describe("getSessionUserRole", () => {
  it("returns Supervisor from user_role JWT claim", () => {
    expect(getSessionUserRole(makeSession({ user_role: "Supervisor" }))).toBe("Supervisor");
  });

  it("returns Member from user_role JWT claim", () => {
    expect(getSessionUserRole(makeSession({ user_role: "Member" }))).toBe("Member");
  });

  it("returns null when user_role claim is absent", () => {
    expect(getSessionUserRole(makeSession({}))).toBeNull();
  });

  it("returns null for null session", () => {
    expect(getSessionUserRole(null)).toBeNull();
  });
});
