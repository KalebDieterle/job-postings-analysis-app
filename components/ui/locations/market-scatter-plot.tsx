"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Label,
  TooltipProps,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface MarketScatterPlotProps {
  data: Array<{
    city: string;
    state?: string;
    jobCount: number;
    avgSalary?: number;
    slug: string;
  }>;
}

// Custom Tooltip Component
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    payload: {
      city: string;
      state?: string;
      jobCount: number;
      avgSalary: number;
      z: number;
    };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4">
        <p className="font-bold text-base text-foreground mb-2">
          {data.city}
          {data.state && (
            <span className="text-muted-foreground text-sm">
              {" "}
              · {data.state}
            </span>
          )}
        </p>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Jobs:{" "}
            <span className="font-semibold text-foreground">
              {data.jobCount.toLocaleString()}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Avg Salary:{" "}
            <span className="font-semibold text-green-500">
              ${(data.avgSalary / 1000).toFixed(0)}k
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function MarketScatterPlot({ data }: MarketScatterPlotProps) {
  const router = useRouter();

  // Filter locations with salary data and prepare chart data
  const chartData = data
    .filter((location) => location.avgSalary && location.avgSalary > 0)
    .map((location) => {
      const salary = location.avgSalary || 0;
      let color = "#ef4444"; // red for <80k
      if (salary >= 120000) {
        color = "#10b981"; // green for >120k
      } else if (salary >= 80000) {
        color = "#f59e0b"; // amber for 80-120k
      }

      return {
        ...location,
        x: location.jobCount,
        y: salary,
        z: Math.sqrt(location.jobCount) * 3, // Size based on job count
        fill: color,
      };
    })
    .slice(0, 50); // Limit to top 50 for clarity

  // Find top 5 outliers for labeling
  const sortedByJobs = [...chartData].sort((a, b) => b.jobCount - a.jobCount);
  const sortedBySalary = [...chartData].sort((a, b) => b.y - a.y);
  const topOutliers = new Set([
    ...sortedByJobs.slice(0, 3).map((d) => d.slug),
    ...sortedBySalary.slice(0, 2).map((d) => d.slug),
  ]);

  const handleClick = (data: any) => {
    if (data && data.slug) {
      router.push(`/locations/${data.slug}`);
    }
  };

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle>Market Opportunity Analysis</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Job availability vs. salary compensation across markets
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground">&lt;$80k</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-muted-foreground">$80k-$120k</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">&gt;$120k</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgb(148 163 184)"
              opacity={0.2}
            />
            <XAxis
              type="number"
              dataKey="x"
              name="Jobs"
              className="text-xs"
              tick={{ fill: "rgb(148 163 184)" }}
              stroke="rgb(148 163 184)"
              tickFormatter={(value) => value.toLocaleString()}
            >
              <Label
                value="Number of Job Opportunities"
                position="bottom"
                className="text-xs"
                fill="rgb(148 163 184)"
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              name="Salary"
              className="text-xs"
              tick={{ fill: "rgb(148 163 184)" }}
              stroke="rgb(148 163 184)"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            >
              <Label
                value="Average Salary"
                angle={-90}
                position="left"
                className="text-xs"
                fill="rgb(148 163 184)"
              />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[50, 400]} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Scatter
              data={chartData}
              animationDuration={800}
              className="cursor-pointer"
              onClick={handleClick}
            >
              {chartData.map((entry, index) => {
                const isOutlier = topOutliers.has(entry.slug);
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={0}
                    cy={0}
                    r={entry.z}
                    fill={entry.fill}
                    fillOpacity={isOutlier ? 0.9 : 0.6}
                    stroke={isOutlier ? "white" : "none"}
                    strokeWidth={isOutlier ? 2 : 0}
                    className="hover:opacity-100 transition-opacity"
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Bubble size represents job volume · Click to explore location details
        </p>
      </CardContent>
    </Card>
  );
}
