"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

interface TrendingSkill {
  skill_name: string;
  current_count: number;
  previous_count: number;
  growth_rate: number;
}

interface ChartDataPoint {
  skill: string;
  current: number;
  previous: number;
}

export function EnhancedTrendingSkills({ data }: { data: TrendingSkill[] }) {
  // Format data for multi-line chart
  const chartData = data.slice(0, 10).map((skill) => ({
    name: skill.skill_name.length > 15 
      ? skill.skill_name.slice(0, 15) + "..." 
      : skill.skill_name,
    fullName: skill.skill_name,
    current: skill.current_count,
    previous: skill.previous_count,
    growth: skill.growth_rate,
  }));

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

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
            View All →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis className="text-xs" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <p className="font-semibold mb-2">{data.fullName}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Current:</span>
                          <span className="font-medium">{data.current.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Previous:</span>
                          <span className="font-medium">{data.previous.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t">
                          <span className="text-muted-foreground">Growth:</span>
                          <span className="font-bold text-green-600">
                            +{data.growth.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="previous"
              stroke={COLORS[0]}
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Previous Period"
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={COLORS[1]}
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Current Period"
            />
          </LineChart>
        </ResponsiveContainer>

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
                +{skill.growth_rate.toFixed(0)}%
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
