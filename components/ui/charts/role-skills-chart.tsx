"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactNumber, truncateAxisLabel } from "@/lib/chart-formatters";

interface SkillData {
  skill_name: string;
  count: number;
}

interface RoleSkillsChartProps {
  data: SkillData[];
  roleTitle: string;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

export function RoleSkillsChart({ data, roleTitle }: RoleSkillsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Skills for {roleTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full md:h-[400px]" role="img" aria-label={`Top skills chart for ${roleTitle}`}>
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20, top: 8, bottom: 8 }}>
            <XAxis type="number" tickFormatter={(value) => formatCompactNumber(Number(value))} />
            <YAxis
              type="category"
              dataKey="skill_name"
              width={90}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => truncateAxisLabel(String(value), 14)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background border rounded p-2 shadow-lg">
                      <p className="font-semibold">
                        {payload[0].payload.skill_name}
                      </p>
                      <p className="text-sm">
                        {payload[0].value} jobs require this skill
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
