"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import Link from "next/link";

interface IndustryData {
  industry_name: string;
  count: number;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#6366f1"
];

export function IndustryBreakdownChart({ data }: { data: IndustryData[] }) {
  const totalJobs = data.reduce((sum, item) => sum + item.count, 0);
  
  const formattedData = data.map((item) => ({
    ...item,
    percentage: ((item.count / totalJobs) * 100).toFixed(1),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Industry Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Top 10 industries by job volume
            </p>
          </div>
          <Link 
            href="/roles" 
            className="text-sm font-medium text-primary hover:underline"
          >
            View All →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={formattedData}
            layout="vertical"
            margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
          >
            <XAxis type="number" />
            <YAxis 
              dataKey="industry_name" 
              type="category" 
              width={150}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border">
                      <p className="font-semibold text-sm">{data.industry_name}</p>
                      <p className="text-sm">
                        <span className="font-medium">{data.count.toLocaleString()}</span> jobs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.percentage}% of total
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList 
                dataKey="percentage" 
                position="right" 
                formatter={(value) => `${value}%`}
                style={{ fontSize: 11, fill: '#666' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
