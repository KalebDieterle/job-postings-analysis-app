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

interface RoleDistributionData {
  title: string;
  count: number;
}

interface RoleDistributionChartProps {
  data: RoleDistributionData[];
}

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#c084fc",
  "#d8b4fe",
  "#e9d5ff",
  "#f3e8ff",
  "#faf5ff",
  "#fbf7ff",
  "#fefeff",
];

export function RoleDistributionChart({ data }: RoleDistributionChartProps) {
  const router = useRouter();

  const handleBarClick = (entry: RoleDistributionData) => {
    const slug = entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    router.push(`/roles/${slug}`);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Role Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Top 10 roles by posting volume
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
          >
            <XAxis type="number" />
            <YAxis
              dataKey="title"
              type="category"
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(99, 102, 241, 0.1)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as RoleDistributionData;
                  return (
                    <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded shadow border">
                      <p className="font-semibold">{data.title}</p>
                      <p className="text-sm">
                        <span className="font-medium">{data.count.toLocaleString()}</span> postings
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to view details
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              onClick={handleBarClick}
              className="cursor-pointer"
            >
              {data.map((entry, index) => (
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
