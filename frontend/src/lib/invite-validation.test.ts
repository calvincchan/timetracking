import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { checkEmailConflict } from "./invite-validation";

function makeClient({
  rpcResult,
  inviteRow,
}: {
  rpcResult: boolean;
  inviteRow: boolean;
}): SupabaseClient {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: inviteRow ? { id: "some-id" } : null,
    error: null,
  });
  const ilike = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ ilike });
  const from = vi.fn().mockReturnValue({ select });

  const rpc = vi.fn().mockResolvedValue({ data: rpcResult, error: null });

  return { rpc, from } as unknown as SupabaseClient;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("checkEmailConflict", () => {
  it("returns profile_exists when RPC returns true", async () => {
    const client = makeClient({ rpcResult: true, inviteRow: false });
    const result = await checkEmailConflict("existing@example.com", client);
    expect(result).toBe("profile_exists");
  });

  it("returns invite_exists when RPC false and invite row found", async () => {
    const client = makeClient({ rpcResult: false, inviteRow: true });
    const result = await checkEmailConflict("pending@example.com", client);
    expect(result).toBe("invite_exists");
  });

  it("returns null when RPC false and no invite row", async () => {
    const client = makeClient({ rpcResult: false, inviteRow: false });
    const result = await checkEmailConflict("fresh@example.com", client);
    expect(result).toBe(null);
  });

  it("profile_exists takes priority — does not query invites table", async () => {
    const client = makeClient({ rpcResult: true, inviteRow: true });
    await checkEmailConflict("both@example.com", client);
    expect(client.from).not.toHaveBeenCalled();
  });
});
