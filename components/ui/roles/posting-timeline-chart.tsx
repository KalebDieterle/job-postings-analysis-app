"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface TimelineData {
  week: string;
  count: number;
}

interface PostingTimelineChartProps {
  data: TimelineData[];
}

export function PostingTimelineChart({ data }: PostingTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Posting Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No timeline data available</p>
        </CardContent>
      </Card>
    );
  }

  // Format data for display
  const formattedData = data.map((item) => ({
    ...item,
    weekLabel: new Date(item.week).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  // Find current week
  const currentWeek = new Date();
  currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
  const currentWeekStr = currentWeek.toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Posting Volume (Last 90 Days)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Weekly posting trends
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const isCurrentWeek = data.week.startsWith(
                    currentWeekStr.substring(0, 10)
                  );
                  return (
                    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded shadow border">
                      <p className="font-semibold">
                        Week of {data.weekLabel}
                        {isCurrentWeek && (
                          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            Current
                          </span>
                        )}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">
                          {data.count.toLocaleString()}
                        </span>{" "}
                        postings
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
