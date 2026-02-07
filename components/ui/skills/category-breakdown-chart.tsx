"use client";

import * as React from "react";
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
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

interface CategoryBreakdownChartProps {
  data: CategoryData[];
  onCategoryClick?: (category: string) => void;
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
];

const CustomBar = (props: any) => {
  const { fill, x, y, width, height, payload } = props;
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={4}
        opacity={isHovered ? 0.8 : 1}
        className="transition-all duration-200 cursor-pointer"
        style={{
          filter: isHovered ? "brightness(1.1)" : "none",
        }}
      />
      {isHovered && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={fill}
          strokeWidth={2}
          rx={4}
          className="pointer-events-none"
        />
      )}
    </g>
  );
};

export function CategoryBreakdownChart({
  data,
  onCategoryClick,
}: CategoryBreakdownChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = data.map((item, index) => ({
    ...item,
    percentage: total > 0 ? ((item.count / total) * 100).toFixed(1) : "0",
    fill: `url(#gradient-${index})`,
    solidFill: COLORS[index % COLORS.length],
  }));

  const handleBarClick = (clickData: any) => {
    if (onCategoryClick) {
      onCategoryClick(clickData.category);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Skills by Category</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Distribution across {data.length} categories
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {total.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Skills
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-slate-500 dark:text-slate-400">
              No category data available
            </p>
          </div>
        ) : (
          <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="horizontal"
                margin={{ top: 5, right: 80, left: 20, bottom: 5 }}
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
                      <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={color} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-200 dark:stroke-slate-800"
                />
                <XAxis
                  type="number"
                  className="text-xs text-slate-600 dark:text-slate-400"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  tickFormatter={(value) => value.toLocaleString()}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={150}
                  className="text-xs text-slate-700 dark:text-slate-300"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <Tooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const tooltipData = payload[0].payload;
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
                              <span className="font-medium">Skills:</span>{" "}
                              {tooltipData.count.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              <span className="font-medium">Share:</span>{" "}
                              {tooltipData.percentage}%
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic">
                            Click to filter
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  onClick={handleBarClick}
                  shape={<CustomBar />}
                  animationDuration={500}
                  animationBegin={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="percentage"
                    position="right"
                    formatter={(value: number) => `${value}%`}
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
