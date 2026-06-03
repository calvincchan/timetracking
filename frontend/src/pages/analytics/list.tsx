import { endOfMonth, format, startOfMonth } from "date-fns";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { AnalyticsAllMembersCharts } from "./analytics-all-members-charts";
import { AnalyticsDetailTable } from "./analytics-detail-table";
import { AnalyticsFilterBar } from "./analytics-filter-bar";
import { AnalyticsKpiCards } from "./analytics-kpi-cards";
import { AnalyticsSingleMemberCharts } from "./analytics-single-member-charts";
import { useAnalyticsData } from "./use-analytics-data";

export function AnalyticsList() {
  const [searchParams] = useSearchParams();

  const { defaultFrom, defaultTo } = useMemo(() => ({
    defaultFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    defaultTo: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  }), []);

  const isValidDateStr = (s: string) => !isNaN(new Date(s + "T00:00:00").getTime());
  const rawFrom = searchParams.get("from") ?? defaultFrom;
  const rawTo = searchParams.get("to") ?? defaultTo;
  const from = isValidDateStr(rawFrom) ? rawFrom : defaultFrom;
  const to = isValidDateStr(rawTo) ? rawTo : defaultTo;
  const userId = searchParams.get("user_id") ?? "";

  const { data: entries = [], isLoading } = useAnalyticsData(from, to, userId || undefined);

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <AnalyticsFilterBar />
      <AnalyticsKpiCards entries={entries} userId={userId} isLoading={isLoading} />
      {!userId && (
        <AnalyticsAllMembersCharts entries={entries} from={from} to={to} isLoading={isLoading} />
      )}
      {!!userId && (
        <AnalyticsSingleMemberCharts entries={entries} from={from} to={to} isLoading={isLoading} />
      )}
      <AnalyticsDetailTable entries={entries} isLoading={isLoading} showMember={!userId} />
    </div>
  );
}
