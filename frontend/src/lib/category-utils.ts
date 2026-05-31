import { supabaseClient } from "@/providers/supabase-client";

/**
 * Checks whether a category name is free to use among active (non-archived)
 * categories. The DB enforces a partial unique index on `name WHERE NOT
 * is_archived`, so archived names may be reused.
 *
 * Pass `excludeId` to ignore a specific row — used when renaming a category
 * (so keeping its own name is not flagged as a conflict) and when unarchiving
 * (to detect a clashing active category before flipping `is_archived`).
 *
 * Returns null if the name is available (or empty — the form's `required`
 * rule owns that case), otherwise an error message string.
 */
export async function checkCategoryNameAvailable(
  name: string,
  excludeId?: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  let query = supabaseClient
    .from("categories")
    .select("id")
    .eq("name", trimmed)
    .eq("is_archived", false);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.limit(1);

  if (error) return error.message;
  if (data && data.length > 0) return "A category with this name already exists.";
  return null;
}
