import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/providers/supabase-client", () => ({
  supabaseClient: {
    rpc: vi.fn(),
  },
}));

import { supabaseClient } from "@/providers/supabase-client";
import { checkEmailInvitable } from "./invite-utils";

afterEach(() => {
  vi.clearAllMocks();
});

describe("checkEmailInvitable", () => {
  it("returns null for a fresh, uninvited email", async () => {
    vi.mocked(supabaseClient.rpc).mockResolvedValue({ data: true, error: null } as never);

    const result = await checkEmailInvitable("new@example.com");

    expect(supabaseClient.rpc).toHaveBeenCalledWith("is_email_invitable", {
      p_email: "new@example.com",
    });
    expect(result).toBeNull();
  });

  it("returns error message for already-registered email", async () => {
    vi.mocked(supabaseClient.rpc).mockResolvedValue({ data: false, error: null } as never);

    const result = await checkEmailInvitable("registered@example.com");

    expect(result).toBe("This email is already registered.");
  });

  it("surfaces a Supabase error", async () => {
    vi.mocked(supabaseClient.rpc).mockResolvedValue({
      data: null,
      error: { message: "connection refused" },
    } as never);

    expect(await checkEmailInvitable("any@example.com")).toBe("connection refused");
  });
});
