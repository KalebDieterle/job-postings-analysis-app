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
} from "recharts";
import { Building2 } from "lucide-react";

interface CompaniesChartProps {
  companies: Array<{
    companyName: string;
    jobCount: number | string;
    companySize?: string | null;
  }>;
}

const CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#10b981",
  "#f97316",
  "#6366f1",
];

export function CompaniesChart({ companies }: CompaniesChartProps) {
  const data = companies.slice(0, 10).map((company, index) => ({
    name:
      company.companyName.length > 20
        ? company.companyName.substring(0, 20) + "..."
        : company.companyName,
    value: Number(company.jobCount),
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-500" />
            <CardTitle>Top Hiring Companies</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No company data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-purple-500" />
          <CardTitle>Top Hiring Companies</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Companies with most job openings
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
              width={120}
              className="text-xs"
              tick={{ fill: "rgb(148 163 184)" }}
              stroke="rgb(148 163 184)"
            />
            <Tooltip
              formatter={(value: number) => [`${value} openings`, "Jobs"]}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                color: "rgb(226 232 240)",
                borderRadius: "0.5rem",
              }}
            />
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
