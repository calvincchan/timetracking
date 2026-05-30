import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/providers/supabase-client", () => ({
  supabaseClient: {
    rpc: vi.fn(),
  },
}));

import { supabaseClient } from "@/providers/supabase-client";
import { checkEmailAllowed } from "./invite-check";

afterEach(() => {
  vi.clearAllMocks();
});

describe("checkEmailAllowed", () => {
  it("returns null for an invited email (row in invites)", async () => {
    vi.mocked(supabaseClient.rpc).mockResolvedValue({
      data: true,
      error: null,
    } as never);

    const result = await checkEmailAllowed("invited@example.com");

    expect(supabaseClient.rpc).toHaveBeenCalledWith("is_email_allowed", {
      p_email: "invited@example.com",
    });
    expect(result).toBeNull();
  });

  it("returns null for a registered user (profile exists)", async () => {
    vi.mocked(supabaseClient.rpc).mockResolvedValue({
      data: true,
      error: null,
    } as never);

    expect(await checkEmailAllowed("existing@example.com")).toBeNull();
  });

  it("returns error message for an uninvited email", async () => {
    vi.mocked(supabaseClient.rpc).mockResolvedValue({
      data: false,
      error: null,
    } as never);

    expect(await checkEmailAllowed("stranger@example.com")).toBe(
      "You haven't been invited."
    );
  });

  it("surfaces a Supabase error", async () => {
    vi.mocked(supabaseClient.rpc).mockResolvedValue({
      data: null,
      error: { message: "connection refused" },
    } as never);

    expect(await checkEmailAllowed("any@example.com")).toBe(
      "connection refused"
    );
  });
});
