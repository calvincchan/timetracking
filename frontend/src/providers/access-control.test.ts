import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabaseClient before importing the module under test.
vi.mock("@/providers/supabase-client", () => ({
  supabaseClient: {
    from: vi.fn(),
  },
}));

import { supabaseClient } from "@/providers/supabase-client";
import { acl } from "./access-control";

// Helper: seed the mock to return a fixed set of permissions.
function mockPermissions(permissions: string[]) {
  const rows = permissions.map((p) => ({ permission: p }));
  vi.mocked(supabaseClient.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }),
  } as never);
}

describe("AccessControl", () => {
  beforeEach(() => {
    acl.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("denies everything before load", () => {
    expect(acl.can("invites", "read")).toBe(false);
    expect(acl.can("invites", "write")).toBe(false);
  });

  it("grants permission after load", async () => {
    mockPermissions(["invites:read"]);
    await acl.load("Supervisor");
    expect(acl.can("invites", "read")).toBe(true);
  });

  it("denies permission not in the granted set", async () => {
    mockPermissions(["invites:read"]);
    await acl.load("Supervisor");
    expect(acl.can("invites", "write")).toBe(false);
    expect(acl.can("time_entries", "read")).toBe(false);
  });

  it("maps Refine list/show -> read", async () => {
    mockPermissions(["invites:read"]);
    await acl.load("Supervisor");
    expect(acl.can("invites", "list")).toBe(true);
    expect(acl.can("invites", "show")).toBe(true);
  });

  it("maps Refine create/edit -> write", async () => {
    mockPermissions(["invites:write"]);
    await acl.load("Supervisor");
    expect(acl.can("invites", "create")).toBe(true);
    expect(acl.can("invites", "edit")).toBe(true);
  });

  it("passes delete through unchanged", async () => {
    mockPermissions(["invites:delete"]);
    await acl.load("Supervisor");
    expect(acl.can("invites", "delete")).toBe(true);
  });

  it("reset -> deny-by-default again", async () => {
    mockPermissions(["invites:read"]);
    await acl.load("Supervisor");
    expect(acl.can("invites", "read")).toBe(true);

    acl.reset();
    expect(acl.can("invites", "read")).toBe(false);
  });

  it("concurrent load calls share one request", async () => {
    mockPermissions(["invites:read"]);
    await Promise.all([acl.load("Supervisor"), acl.load("Supervisor")]);
    expect(supabaseClient.from).toHaveBeenCalledTimes(1);
  });
});
