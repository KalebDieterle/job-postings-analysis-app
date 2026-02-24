"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface CategoryData {
  category: string;
  count: number;
  percentage?: number;
}

interface CategoryBreakdownChartProps {
  data: CategoryData[];
  onCategoryClick?: (category: string) => void;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
];

const MAX_VISIBLE_CATEGORIES = 12;

function formatDemand(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
}

export function CategoryBreakdownChart({
  data,
  onCategoryClick,
}: CategoryBreakdownChartProps) {
  const filteredData = data.filter((item) => Number(item.count) > 0);
  const sortedData = [...filteredData].sort((a, b) => b.count - a.count);
  const total = sortedData.reduce((sum, item) => sum + item.count, 0);

  const normalizedData = sortedData.map((item, index) => {
    const pct =
      typeof item.percentage === "number"
        ? item.percentage
        : total > 0
          ? (item.count / total) * 100
          : 0;

    return {
      ...item,
      percentage: Number(pct.toFixed(1)),
      fill: `url(#gradient-${index % COLORS.length})`,
      solidFill: COLORS[index % COLORS.length],
    };
  });

  const hasOverflow = normalizedData.length > MAX_VISIBLE_CATEGORIES;
  const visibleData = normalizedData.slice(0, MAX_VISIBLE_CATEGORIES);
  const hiddenData = normalizedData.slice(MAX_VISIBLE_CATEGORIES);
  const hiddenCount = hiddenData.reduce((sum, item) => sum + item.count, 0);
  const hiddenPct = total > 0 ? Number(((hiddenCount / total) * 100).toFixed(1)) : 0;

  const chartData = hasOverflow
    ? [
        ...visibleData,
        {
          category: "Other",
          count: hiddenCount,
          percentage: hiddenPct,
          fill: "url(#gradient-overflow)",
          solidFill: "#64748b",
        },
      ]
    : visibleData;

  const handleBarClick = (clickData: { category?: string }) => {
    if (!onCategoryClick || !clickData?.category || clickData.category === "Other") {
      return;
    }
    onCategoryClick(clickData.category);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Skill Areas by Demand</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Demand distribution across {sortedData.length} skill areas
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {total.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Demand</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400">No category data available</p>
          </div>
        ) : (
          <div className="h-[320px] sm:h-[380px] md:h-[440px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 28, left: 20, bottom: 8 }}
                barGap={6}
              >
                <defs>
                  {COLORS.map((color, index) => (
                    <linearGradient
                      key={`gradient-${index}`}
                      id={`gradient-${index}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={color} stopOpacity={0.75} />
                      <stop offset="100%" stopColor={color} stopOpacity={1} />
                    </linearGradient>
                  ))}
                  <linearGradient id="gradient-overflow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#64748b" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="#64748b" stopOpacity={1} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  className="stroke-slate-200 dark:stroke-slate-800"
                />

                <XAxis
                  type="number"
                  domain={[0, "dataMax"]}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  tickFormatter={(value) => formatDemand(Number(value))}
                  stroke="currentColor"
                  opacity={0.5}
                />

                <YAxis
                  type="category"
                  dataKey="category"
                  width={170}
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.6}
                />

                <Tooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;

                    const tooltipData = payload[0].payload as {
                      category: string;
                      count: number;
                      percentage: number;
                      solidFill: string;
                    };

                    return (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-lg backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tooltipData.solidFill }}
                          />
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">
                            {tooltipData.category}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Demand:</span>{" "}
                            {tooltipData.count.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Share:</span>{" "}
                            {tooltipData.percentage}%
                          </p>
                        </div>
                        {tooltipData.category !== "Other" && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic">
                            Click to filter
                          </p>
                        )}
                      </div>
                    );
                  }}
                />

                <Bar
                  dataKey="count"
                  radius={[0, 8, 8, 0]}
                  onClick={handleBarClick}
                  animationDuration={750}
                  animationEasing="ease-out"
                  maxBarSize={26}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="percentage"
                    position="right"
                    formatter={(value: string | number) => `${value}%`}
                    className="fill-slate-600 dark:fill-slate-400 text-xs font-medium"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
