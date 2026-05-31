import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/providers/supabase-client", () => ({
  supabaseClient: {
    from: vi.fn(),
  },
}));

import { supabaseClient } from "@/providers/supabase-client";
import { checkCategoryNameAvailable } from "./category-utils";

// Builds a chainable query-builder mock whose terminal `limit` resolves to
// the supplied result. Records the filters applied along the way.
function mockQuery(result: { data: unknown; error: unknown }) {
  const eqArgs: Array<[string, unknown]> = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((col: string, val: unknown) => {
      eqArgs.push([col, val]);
      return builder;
    }),
    limit: vi.fn(() => Promise.resolve(result)),
  };
  vi.mocked(supabaseClient.from).mockReturnValue(builder as never);
  return { builder, eqArgs };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("checkCategoryNameAvailable", () => {
  it("returns null when no active category matches the name", async () => {
    const { eqArgs } = mockQuery({ data: [], error: null });

    const result = await checkCategoryNameAvailable("Development");

    expect(supabaseClient.from).toHaveBeenCalledWith("categories");
    expect(eqArgs).toEqual([
      ["name", "Development"],
      ["is_archived", false],
    ]);
    expect(result).toBeNull();
  });

  it("returns an error message when an active category already exists", async () => {
    mockQuery({ data: [{ id: "abc" }], error: null });

    const result = await checkCategoryNameAvailable("Meetings");

    expect(result).toBe("A category with this name already exists.");
  });

  it("trims surrounding whitespace before checking", async () => {
    const { eqArgs } = mockQuery({ data: [], error: null });

    await checkCategoryNameAvailable("  Research  ");

    expect(eqArgs[0]).toEqual(["name", "Research"]);
  });

  it("returns null for an empty/whitespace name without querying", async () => {
    const result = await checkCategoryNameAvailable("   ");

    expect(supabaseClient.from).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("surfaces a Supabase error message", async () => {
    mockQuery({ data: null, error: { message: "connection refused" } });

    expect(await checkCategoryNameAvailable("Anything")).toBe("connection refused");
  });
});
