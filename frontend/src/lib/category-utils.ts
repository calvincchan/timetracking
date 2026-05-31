import { supabaseClient } from "@/providers/supabase-client";

/**
 * Checks whether a category name is free to use among active (non-archived)
 * categories. The DB enforces a partial unique index on `name WHERE NOT
 * is_archived`, so archived names may be reused.
 *
 * Returns null if the name is available (or empty — the form's `required`
 * rule owns that case), otherwise an error message string.
 */
export async function checkCategoryNameAvailable(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data, error } = await supabaseClient
    .from("categories")
    .select("id")
    .eq("name", trimmed)
    .eq("is_archived", false)
    .limit(1);

  if (error) return error.message;
  if (data && data.length > 0) return "A category with this name already exists.";
  return null;
}
