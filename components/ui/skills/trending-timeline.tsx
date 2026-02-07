"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

interface TimelineDataPoint {
  skill_name: string;
  day: string;
  count: number;
}

interface TrendingTimelineProps {
  data: TimelineDataPoint[];
  skillNames: string[];
}

const LINE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#a855f7",
];

export function TrendingTimeline({ data, skillNames }: TrendingTimelineProps) {
  const [hiddenSkills, setHiddenSkills] = React.useState<Set<string>>(
    new Set(),
  );

  // Transform data into format suitable for Recharts
  const transformedData = React.useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();

    data.forEach((item) => {
      if (!dateMap.has(item.day)) {
        dateMap.set(item.day, {});
      }
      const dayData = dateMap.get(item.day)!;
      dayData[item.skill_name] = item.count;
    });

    return Array.from(dateMap.entries())
      .map(([day, skills]) => ({
        day,
        date: format(parseISO(day), "MMM dd"),
        ...skills,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [data]);

  const toggleSkill = (skillName: string) => {
    setHiddenSkills((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(skillName)) {
        newSet.delete(skillName);
      } else {
        newSet.add(skillName);
      }
      return newSet;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trending Skills Timeline</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track demand for top skills over the last 90 days. Click legend items
          to toggle visibility.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={transformedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-200 dark:stroke-slate-800"
              />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "currentColor" }}
                label={{
                  value: "Job Postings",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "currentColor" },
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-white dark:bg-slate-950 p-3 shadow-md">
                        <p className="font-semibold text-sm mb-2">{label}</p>
                        {payload.map((entry, index) => (
                          <p
                            key={index}
                            className="text-xs"
                            style={{ color: entry.color }}
                          >
                            {entry.name}: {entry.value} jobs
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                onClick={(e) => toggleSkill(e.value)}
                wrapperStyle={{ cursor: "pointer" }}
                formatter={(value) => (
                  <span
                    className={
                      hiddenSkills.has(value) ? "line-through opacity-50" : ""
                    }
                  >
                    {value}
                  </span>
                )}
              />
              {skillNames.map((skill, index) => (
                <Line
                  key={skill}
                  type="monotone"
                  dataKey={skill}
                  stroke={LINE_COLORS[index % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  hide={hiddenSkills.has(skill)}
                  animationDuration={300}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current week highlight note */}
        <p className="mt-4 text-xs text-center text-slate-500 dark:text-slate-400">
          Click on the legend items to show/hide specific skills
        </p>
      </CardContent>
    </Card>
  );
}
