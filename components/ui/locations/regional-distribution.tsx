"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from "recharts";
import { Globe } from "lucide-react";

interface RegionalDistributionProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

const CHART_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#10b981", // green
];

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; percentage: number; fill: string };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: data.fill }}
          />
          <p className="font-bold text-sm text-foreground">{data.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {data.value.toLocaleString()}
            </span>{" "}
            jobs
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {data.percentage.toFixed(1)}%
            </span>{" "}
            of total
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function RegionalDistribution({ data }: RegionalDistributionProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <Card className="hover:shadow-xl transition-shadow h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle>Geographic Distribution</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Job market breakdown by region
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              innerRadius={55}
              outerRadius={90}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Custom legend list */}
        <div className="space-y-2">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span
                className="shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="flex-1 text-sm truncate text-foreground">
                {entry.name}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {entry.value.toLocaleString()}
              </span>
              <span
                className="text-xs font-medium tabular-nums px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${entry.fill}20`,
                  color: entry.fill,
                }}
              >
                {entry.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
