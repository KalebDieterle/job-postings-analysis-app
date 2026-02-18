"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slugify";

interface RoleSalaryData {
  title: string;
  avg_salary: number;
  posting_count: number;
  salary_coverage: number;
}

interface SalaryByRoleChartProps {
  data: RoleSalaryData[];
}

// Emerald/teal gradient palette — visually distinct from the purple role distribution chart
const COLORS = [
  "#059669", "#0d9488", "#0891b2", "#0284c7", "#1d4ed8",
  "#4f46e5", "#7c3aed", "#9333ea", "#c026d3", "#db2777",
  "#e11d48", "#dc2626", "#d97706", "#65a30d", "#16a34a",
];

export function SalaryByRoleChart({ data }: SalaryByRoleChartProps) {
  const router = useRouter();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Salary Benchmark by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No salary data available</p>
        </CardContent>
      </Card>
    );
  }

  // Sort ascending so highest-paying role renders at the top of the horizontal chart
  const sorted = [...data].sort((a, b) => a.avg_salary - b.avg_salary);

  const handleBarClick = (entry: RoleSalaryData) => {
    const slug = slugify(entry.title);
    if (slug) router.push(`/roles/${slug}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary Benchmark by Role</CardTitle>
        <p className="text-sm text-muted-foreground">
          Average annual salary — click any bar to explore
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 10, right: 55, left: 5, bottom: 10 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              dataKey="title"
              type="category"
              width={130}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as RoleSalaryData;
                  return (
                    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded shadow border text-sm">
                      <p className="font-semibold mb-1">{d.title}</p>
                      <p>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          ${d.avg_salary.toLocaleString()}
                        </span>{" "}
                        avg salary
                      </p>
                      <p className="text-muted-foreground">
                        {d.posting_count.toLocaleString()} total postings
                      </p>
                      <p className="text-muted-foreground">
                        {d.salary_coverage}% include salary data
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Click to explore role →</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="avg_salary"
              radius={[0, 4, 4, 0]}
              onClick={handleBarClick}
              className="cursor-pointer"
              label={{
                position: "right",
                formatter: (v: number) => `$${Math.round(v / 1000)}k`,
                fontSize: 11,
                fill: "#6b7280",
              }}
            >
              {sorted.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
