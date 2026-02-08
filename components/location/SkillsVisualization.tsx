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
  TooltipProps,
} from "recharts";
import { Code2 } from "lucide-react";

interface SkillsVisualizationProps {
  skills: Array<{ skillName: string; count: number | string }>;
}

const CHART_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#10b981", // green
  "#f97316", // orange
  "#6366f1", // indigo
];

// Custom Tooltip Component
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; fill: string };
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: data.payload.fill }}
          />
          <p className="font-bold text-sm text-foreground">{label}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data.value}</span>{" "}
          jobs
        </p>
      </div>
    );
  }
  return null;
};

export function SkillsVisualization({ skills }: SkillsVisualizationProps) {
  const data = skills.slice(0, 10).map((skill, index) => ({
    name: skill.skillName,
    value: Number(skill.count),
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-purple-500" />
            <CardTitle>Top Skills in Demand</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No skills data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-purple-500" />
          <CardTitle>Top Skills in Demand</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Most requested skills across job postings
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 20, right: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgb(148 163 184)"
              opacity={0.2}
            />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fill: "rgb(148 163 184)" }}
              stroke="rgb(148 163 184)"
            />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              className="text-xs"
              tick={{ fill: "rgb(148 163 184)" }}
              stroke="rgb(148 163 184)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
