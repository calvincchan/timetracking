import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeAllMembersKpi,
  computeSingleMemberKpi,
  type AnalyticsEntry,
} from "./analytics-utils";

interface KpiCardProps {
  title: string;
  value: string;
}

function KpiCard({ title, value }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24" />
      </CardContent>
    </Card>
  );
}

interface AnalyticsKpiCardsProps {
  entries: AnalyticsEntry[];
  userId: string;
  isLoading: boolean;
}

export function AnalyticsKpiCards({ entries, userId, isLoading }: AnalyticsKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
    );
  }

  if (userId) {
    const kpi = computeSingleMemberKpi(entries);
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard title="Total Hours" value={`${kpi.totalHours} hrs`} />
        <KpiCard title="Days Logged" value={String(kpi.daysLogged)} />
        <KpiCard title="Avg Hours / Day" value={`${kpi.avgHoursPerDay} hrs`} />
        <KpiCard title="Top Category" value={kpi.topCategory} />
      </div>
    );
  }

  const kpi = computeAllMembersKpi(entries);
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <KpiCard title="Total Hours" value={`${kpi.totalHours} hrs`} />
      <KpiCard title="Active Members" value={String(kpi.activeMemberCount)} />
      <KpiCard title="Avg Hours / Member" value={`${kpi.avgHoursPerMember} hrs`} />
      <KpiCard title="Top Category" value={kpi.topCategory} />
    </div>
  );
}
