"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { formatGrowthPercentage } from "@/lib/utils";
import { formatCompactNumber, truncateAxisLabel } from "@/lib/chart-formatters";

interface TrendingSkill {
  skill_name: string;
  current_count: number;
  previous_count: number;
  growth_rate: number;
  comparison_mode?: "contiguous" | "fallback" | "none";
}

export function EnhancedTrendingSkills({
  data,
  comparisonMode,
}: {
  data: TrendingSkill[];
  comparisonMode?: "contiguous" | "fallback" | "none";
}) {
  const effectiveComparisonMode =
    comparisonMode ?? data[0]?.comparison_mode ?? "none";
  const showPercentGrowth = effectiveComparisonMode === "contiguous";

  const chartData = data.slice(0, 10).map((skill) => ({
    name: skill.skill_name,
    fullName: skill.skill_name,
    current: skill.current_count,
    previous: skill.previous_count,
    growth: skill.growth_rate,
  }));

  const avgGrowth =
    chartData.length > 0
      ? chartData.reduce((sum, item) => sum + item.growth, 0) / chartData.length
      : 0;
  const topGrowth = [...chartData].sort((a, b) => b.growth - a.growth)[0];
  const maxCurrent = Math.max(...chartData.map((item) => item.current), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Trending Skills
            </CardTitle>
            <CardDescription>
              Skills with the highest growth in demand
            </CardDescription>
          </div>
          <Link
            href="/skills"
            className="text-sm font-medium text-primary hover:underline"
          >
            View All
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg border px-3 py-2 bg-background/60">
            <p className="text-[11px] text-muted-foreground">Average Growth</p>
            <p className="text-sm font-semibold text-green-600">
              {showPercentGrowth
                ? formatGrowthPercentage(avgGrowth, { decimals: 1 })
                : "N/A"}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2 bg-background/60">
            <p className="text-[11px] text-muted-foreground">Top Breakout Skill</p>
            <p className="text-sm font-semibold truncate">
              {topGrowth?.fullName || "N/A"}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2 bg-background/60 col-span-2 md:col-span-1">
            <p className="text-[11px] text-muted-foreground">Peak Current Demand</p>
            <p className="text-sm font-semibold">{formatCompactNumber(maxCurrent)}</p>
          </div>
        </div>

        <div
          className="h-[320px] w-full md:h-[350px]"
          role="img"
          aria-label="Trending skills chart"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            >
              <defs>
                <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.04} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-muted/40"
              />
              <XAxis
                dataKey="name"
                className="text-xs"
                angle={-32}
                textAnchor="end"
                height={70}
                tickFormatter={(value) => truncateAxisLabel(String(value), 18)}
              />
              <YAxis
                className="text-xs"
                tickFormatter={(value) => formatCompactNumber(Number(value))}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as {
                      fullName: string;
                      current: number;
                      previous: number;
                      growth: number;
                    };

                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <p className="font-semibold mb-2">{point.fullName}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Current:</span>
                            <span className="font-medium text-cyan-500">
                              {point.current.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Previous:</span>
                            <span className="font-medium text-blue-400">
                              {point.previous.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t">
                            <span className="text-muted-foreground">Growth:</span>
                            <span className="font-bold text-green-600">
                              {showPercentGrowth
                                ? formatGrowthPercentage(point.growth, { decimals: 1 })
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Area
                type="monotone"
                dataKey="previous"
                stroke="none"
                fill="url(#previousGradient)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke="none"
                fill="url(#currentGradient)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="previous"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ r: 3, fill: "#60a5fa", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#60a5fa", stroke: "#0b1220", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#22d3ee"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#22d3ee", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#22d3ee", stroke: "#0b1220", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            Previous Period
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            Current Period
          </span>
        </div>
        {!showPercentGrowth && (
          <p className="mt-2 text-xs text-muted-foreground">
            Growth percentages are unavailable because the previous contiguous
            timeframe has a data gap.
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-6">
          {data.slice(0, 5).map((skill, idx) => (
            <Link
              key={idx}
              href={`/skills/${skill.skill_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="p-2 rounded-lg border hover:border-primary hover:bg-accent transition-all text-center group"
            >
              <p className="text-xs font-medium truncate group-hover:text-primary">
                {skill.skill_name}
              </p>
              <p className="text-xs text-green-600 font-semibold mt-1">
                {showPercentGrowth
                  ? formatGrowthPercentage(skill.growth_rate, { decimals: 0 })
                  : "N/A"}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

