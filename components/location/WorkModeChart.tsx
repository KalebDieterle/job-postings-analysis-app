"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  TooltipProps,
} from "recharts";
import { Briefcase } from "lucide-react";
import { calculateWorkModeDistribution } from "@/lib/location-analytics";

interface WorkModeChartProps {
  jobs: Array<{ remoteAllowed?: boolean | null }>;
}

const COLORS = {
  remote: "#10b981", // green
  hybrid: "#3b82f6", // blue
  onsite: "#6b7280", // gray
};

// Custom Tooltip Component
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; color: string };
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
            style={{ backgroundColor: data.color }}
          />
          <p className="font-bold text-sm text-foreground">{data.name}</p>
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

export function WorkModeChart({ jobs }: WorkModeChartProps) {
  const distribution = calculateWorkModeDistribution(jobs);

  const data = [
    { name: "Remote", value: distribution.remote, color: COLORS.remote },
    { name: "Hybrid", value: distribution.hybrid, color: COLORS.hybrid },
    { name: "On-site", value: distribution.onsite, color: COLORS.onsite },
  ].filter((item) => item.value > 0);

  if (data.length === 0 || jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            <CardTitle>Work Mode Distribution</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No work mode data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-500" />
          <CardTitle>Work Mode Distribution</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Breakdown of work arrangements
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
