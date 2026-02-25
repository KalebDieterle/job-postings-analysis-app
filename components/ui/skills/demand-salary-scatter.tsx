"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ZAxis,
} from "recharts";
import { useRouter } from "next/navigation";

interface SkillDataPoint {
  name: string;
  demand: number;
  salary: number;
  growth?: number;
  category?: string;
}

interface DemandSalaryScatterProps {
  data: SkillDataPoint[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Programming Languages": "#3b82f6",
  "Frameworks & Libraries": "#10b981",
  "Databases & Data": "#8b5cf6",
  "DevOps & Cloud": "#f59e0b",
  "Tools & Platforms": "#ef4444",
  "AI/ML & Data Science": "#ec4899",
  "Soft Skills": "#06b6d4",
  default: "#64748b",
};

export function DemandSalaryScatter({ data }: DemandSalaryScatterProps) {
  const router = useRouter();

  const processedData = data.map((item) => ({
    ...item,
    x: item.demand,
    y: item.salary,
    z: item.growth || 10,
    fill: CATEGORY_COLORS[item.category || ""] || CATEGORY_COLORS.default,
  }));

  // Calculate quadrant lines
  const avgDemand =
    data.reduce((sum, item) => sum + item.demand, 0) / data.length;
  const avgSalary =
    data.reduce((sum, item) => sum + item.salary, 0) / data.length;

  const handleClick = (data: any) => {
    if (data && data.name) {
      router.push(`/skills/${encodeURIComponent(data.name.toLowerCase())}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demand vs Salary Analysis</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Explore the relationship between skill demand and median salary.
          Bubble size indicates growth rate.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-200 dark:stroke-slate-800"
              />
              <XAxis
                type="number"
                dataKey="x"
                name="Demand"
                label={{
                  value: "Job Postings (Demand)",
                  position: "bottom",
                  offset: 40,
                  style: { fill: "currentColor" },
                }}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Salary"
                label={{
                  value: "Median Salary ($)",
                  angle: -90,
                  position: "left",
                  offset: 40,
                  style: { fill: "currentColor" },
                }}
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <ZAxis type="number" dataKey="z" range={[50, 400]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-white dark:bg-slate-950 p-3 shadow-md">
                        <p className="font-semibold text-sm mb-2">
                          {data.name}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Demand: {data.demand.toLocaleString()} jobs
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Salary: ${(data.salary / 1000).toFixed(0)}k
                        </p>
                        {data.growth && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Growth: {data.growth.toFixed(1)}%
                          </p>
                        )}
                        {data.category && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {data.category}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                data={processedData}
                onClick={handleClick}
                className="cursor-pointer"
              >
                {processedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    fillOpacity={0.8}
                  />
                ))}
              </Scatter>

              {/* Quadrant labels */}
              <text
                x="85%"
                y="15%"
                textAnchor="middle"
                className="text-xs font-medium fill-green-600 dark:fill-green-400"
              >
                High Demand
                <tspan x="85%" dy="1.2em">
                  High Salary
                </tspan>
              </text>
              <text
                x="15%"
                y="15%"
                textAnchor="middle"
                className="text-xs font-medium fill-blue-600 dark:fill-blue-400"
              >
                Low Demand
                <tspan x="15%" dy="1.2em">
                  High Salary
                </tspan>
              </text>
              <text
                x="85%"
                y="85%"
                textAnchor="middle"
                className="text-xs font-medium fill-orange-600 dark:fill-orange-400"
              >
                High Demand
                <tspan x="85%" dy="1.2em">
                  Low Salary
                </tspan>
              </text>
              <text
                x="15%"
                y="85%"
                textAnchor="middle"
                className="text-xs font-medium fill-slate-600 dark:fill-slate-400"
              >
                Low Demand
                <tspan x="15%" dy="1.2em">
                  Low Salary
                </tspan>
              </text>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          {Object.entries(CATEGORY_COLORS)
            .filter(([key]) => key !== "default")
            .map(([category, color]) => (
              <div key={category} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {category}
                </span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
