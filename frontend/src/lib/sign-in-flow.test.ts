import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/invite-check", () => ({
  checkEmailAllowed: vi.fn(),
}));

vi.mock("@/providers/supabase-client", () => ({
  supabaseClient: {
    auth: {
      signInWithOtp: vi.fn(),
    },
  },
}));

import { checkEmailAllowed } from "@/lib/invite-check";
import { supabaseClient } from "@/providers/supabase-client";
import { requestOtp } from "./sign-in-flow";

afterEach(() => {
  vi.clearAllMocks();
});

describe("requestOtp", () => {
  it("returns error for uninvited email without calling signInWithOtp", async () => {
    vi.mocked(checkEmailAllowed).mockResolvedValue("You haven't been invited.");

    const result = await requestOtp("stranger@example.com");

    expect(result).toBe("You haven't been invited.");
    expect(supabaseClient.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("returns null and sends OTP for invited email", async () => {
    vi.mocked(checkEmailAllowed).mockResolvedValue(null);
    vi.mocked(supabaseClient.auth.signInWithOtp).mockResolvedValue({
      data: {},
      error: null,
    } as never);

    const result = await requestOtp("invited@example.com");

    expect(supabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "invited@example.com",
      options: { shouldCreateUser: true },
    });
    expect(result).toBeNull();
  });

  it("surfaces OTP send error for invited email", async () => {
    vi.mocked(checkEmailAllowed).mockResolvedValue(null);
    vi.mocked(supabaseClient.auth.signInWithOtp).mockResolvedValue({
      data: {},
      error: { message: "Email rate limit exceeded" },
    } as never);

    const result = await requestOtp("invited@example.com");

    expect(result).toBe("Email rate limit exceeded");
  });
});
