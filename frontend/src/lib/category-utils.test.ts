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
  const neqArgs: Array<[string, unknown]> = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((col: string, val: unknown) => {
      eqArgs.push([col, val]);
      return builder;
    }),
    neq: vi.fn((col: string, val: unknown) => {
      neqArgs.push([col, val]);
      return builder;
    }),
    limit: vi.fn(() => Promise.resolve(result)),
  };
  vi.mocked(supabaseClient.from).mockReturnValue(builder as never);
  return { builder, eqArgs, neqArgs };
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

  it("excludes a category by id when excludeId is given (rename to own name)", async () => {
    const { eqArgs, neqArgs } = mockQuery({ data: [], error: null });

    const result = await checkCategoryNameAvailable("Development", "cat-1");

    expect(eqArgs).toEqual([
      ["name", "Development"],
      ["is_archived", false],
    ]);
    expect(neqArgs).toEqual([["id", "cat-1"]]);
    expect(result).toBeNull();
  });

  it("still reports a conflict against a different active category when excludeId is set", async () => {
    const { neqArgs } = mockQuery({ data: [{ id: "cat-2" }], error: null });

    const result = await checkCategoryNameAvailable("Meetings", "cat-1");

    expect(neqArgs).toEqual([["id", "cat-1"]]);
    expect(result).toBe("A category with this name already exists.");
  });

  it("does not call neq when excludeId is omitted", async () => {
    const { neqArgs } = mockQuery({ data: [], error: null });

    await checkCategoryNameAvailable("Research");

    expect(neqArgs).toEqual([]);
  });
});
