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
  TooltipProps,
} from "recharts";
import { formatSalary } from "@/lib/location-utils";
import { DollarSign } from "lucide-react";
import { useState } from "react";

interface SalaryDistributionChartProps {
  avgMinSalary?: number | string | null;
  avgMedSalary?: number | string | null;
  avgMaxSalary?: number | string | null;
}

// Custom Tooltip Component
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; fill: string };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: data.fill }}
          />
          <p className="font-bold text-sm text-foreground">{data.name}</p>
        </div>
        <p className="text-base font-semibold text-foreground">
          {formatSalary(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

// Custom Bar Shape with Subtle Hover Effect
const CustomBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  const [isHovered, setIsHovered] = useState(false);

  // Calculate the current opacity and scale based on hover state
  const opacity = isHovered ? 0.95 : 1;
  const scaleY = isHovered ? 1.02 : 1;
  const scaledHeight = height * scaleY;
  const offsetY = (height - scaledHeight) / 2;

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        filter: isHovered ? "brightness(1.1)" : "brightness(1)",
        transition: "filter 0.2s ease-in-out, transform 0.2s ease-in-out",
      }}
    >
      <rect
        x={x}
        y={y + offsetY}
        width={width}
        height={scaledHeight}
        fill={fill}
        rx={8}
        ry={8}
        opacity={opacity}
        style={{
          transition: "opacity 0.2s ease-in-out",
        }}
      />
    </g>
  );
};

export function SalaryDistributionChart({
  avgMinSalary,
  avgMedSalary,
  avgMaxSalary,
}: SalaryDistributionChartProps) {
  const data = [
    { name: "Minimum", value: Number(avgMinSalary || 0), fill: "#ef4444" },
    { name: "Average", value: Number(avgMedSalary || 0), fill: "#3b82f6" },
    { name: "Maximum", value: Number(avgMaxSalary || 0), fill: "#10b981" },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <CardTitle>Salary Distribution</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No salary data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          <CardTitle>Salary Distribution</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Average salary ranges across all positions
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgb(148 163 184)"
              opacity={0.2}
            />
            <XAxis
              dataKey="name"
              className="text-xs"
              tick={{ fill: "rgb(148 163 184)" }}
              stroke="rgb(148 163 184)"
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              className="text-xs"
              tick={{ fill: "rgb(148 163 184)" }}
              stroke="rgb(148 163 184)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
