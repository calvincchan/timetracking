import { QUERY_KEYS } from "@/constants/query-keys";
import { supabaseClient } from "@/providers/supabase-client";
import type { Tables } from "@/types/database";
import { useQuery } from "@tanstack/react-query";
import type { AnalyticsEntry } from "./analytics-utils";

async function fetchAnalyticsEntries(
  from: string,
  to: string,
  userId?: string,
): Promise<AnalyticsEntry[]> {
  let query = supabaseClient
    .from("time_entries")
    .select("id, entry_date, duration_minutes, note, user_id, profiles(full_name), categories(name), category_id")
    .gte("entry_date", from)
    .lte("entry_date", to);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    entry_date: row.entry_date,
    duration_minutes: row.duration_minutes,
    user_id: row.user_id,
    category_id: row.category_id,
    user_full_name: (row.profiles as Pick<Tables<"profiles">, "full_name"> | null)?.full_name ?? "",
    category_name: (row.categories as Pick<Tables<"categories">, "name"> | null)?.name ?? "",
    note: row.note,
  }));
}

export function useAnalyticsData(from: string, to: string, userId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.analyticsEntries, from, to, userId ?? null],
    queryFn: () => fetchAnalyticsEntries(from, to, userId),
  });
}
