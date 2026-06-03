import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { buildDailyBarSeries, buildPieSeries, type AnalyticsEntry } from "./analytics-utils";

interface Props {
  entries: AnalyticsEntry[];
  from: string;
  to: string;
  isLoading: boolean;
}

const CARD_TITLES = ["Daily Hours", "Hours by Category"] as const;

const barChartConfig: ChartConfig = {
  hours: { label: "Hours", color: "var(--chart-1)" },
};

export function AnalyticsSingleMemberCharts({ entries, from, to, isLoading }: Props) {
  const barData = useMemo(() => {
    try {
      return buildDailyBarSeries(entries, from, to);
    } catch (err) {
      console.error("AnalyticsSingleMemberCharts: failed to build daily bar series", err);
      return [];
    }
  }, [entries, from, to]);

  const pieData = useMemo(() => {
    try {
      return buildPieSeries(entries);
    } catch (err) {
      console.error("AnalyticsSingleMemberCharts: failed to build pie series", err);
      return [];
    }
  }, [entries]);

  const pieChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    pieData.forEach((d, i) => {
      config[`slice${i}`] = {
        label: d.name,
        color: `var(--chart-${(i % 5) + 1})`,
      };
    });
    return config;
  }, [pieData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CARD_TITLES.map((title) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CARD_TITLES.map((title) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">No data for this period.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Daily Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig} className="h-64 w-full">
            <BarChart data={barData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis unit="h" tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
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
          <ChartContainer config={pieChartConfig} className="h-64 w-full">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="name" hideLabel />}
              />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius="50%"
                outerRadius="80%"
              >
                {pieData.map((_d, i) => (
                  <Cell key={`slice${i}`} fill={`var(--color-slice${i})`} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
