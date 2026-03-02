"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatChartDate, formatCompactNumber } from "@/lib/chart-formatters";

type TimelineData = {
  day: string;
  count: number;
};

export function SkillTimelineChart({ data }: { data: TimelineData[] }) {
  // Format the ISO date to something pretty like "Jan 12"
  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: formatChartDate(d.day),
  }));

  return (
    <div className="h-full min-h-[260px] w-full" role="img" aria-label="Skill posting timeline chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="formattedDate"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            minTickGap={20}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => formatCompactNumber(Number(value))}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--background))",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(value) => [Number(value).toLocaleString(), "Postings"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            fillOpacity={1}
            fill="url(#colorCount)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
