import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  buildStackedBarSeries,
  buildHorizontalBarSeries,
  type AnalyticsEntry,
} from "./analytics-utils";

interface Props {
  entries: AnalyticsEntry[];
  from: string;
  to: string;
  isLoading: boolean;
}

export function AnalyticsAllMembersCharts({ entries, from, to, isLoading }: Props) {
  const memberNames = useMemo(
    () => Array.from(new Set(entries.map((e) => e.user_full_name))).filter(Boolean),
    [entries],
  );

  // Use index-based safe keys to avoid spaces in CSS custom property names
  const memberKeyMap = useMemo(() => {
    const map = new Map<string, string>();
    memberNames.forEach((name, i) => map.set(name, `member${i}`));
    return map;
  }, [memberNames]);

  const stackedChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    memberNames.forEach((name, i) => {
      config[`member${i}`] = {
        label: name,
        color: `var(--chart-${(i % 5) + 1})`,
      };
    });
    return config;
  }, [memberNames]);

  const stackedData = useMemo(() => {
    const raw = buildStackedBarSeries(entries, from, to);
    return raw.map((datum) => {
      const row: Record<string, string | number> = { bucket: datum.bucket };
      for (const [k, v] of Object.entries(datum)) {
        if (k === "bucket") continue;
        const safeKey = memberKeyMap.get(k);
        if (safeKey !== undefined) row[safeKey] = v;
      }
      return row;
    });
  }, [entries, from, to, memberKeyMap]);

  const categoryData = useMemo(() => buildHorizontalBarSeries(entries), [entries]);

  const categoryChartConfig = useMemo<ChartConfig>(
    () => ({ hours: { label: "Hours", color: "var(--chart-1)" } }),
    [],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Hours by Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={stackedChartConfig} className="h-64 w-full">
            <BarChart data={stackedData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis unit="h" tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {memberNames.map((_name, i) => (
                <Bar
                  key={`member${i}`}
                  dataKey={`member${i}`}
                  stackId="members"
                  fill={`var(--color-member${i})`}
                />
              ))}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Hours by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={categoryChartConfig} className="h-64 w-full">
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="category"
                type="category"
                tick={{ fontSize: 12 }}
                width={120}
              />
              <XAxis type="number" unit="h" tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="hours" fill="var(--color-hours)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
