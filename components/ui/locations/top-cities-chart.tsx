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
  TooltipProps,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface TopCitiesChartProps {
  data: Array<{
    city: string;
    state?: string;
    jobCount: number;
    avgSalary?: number;
    slug: string;
  }>;
}

// Custom Tooltip Component
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      city: string;
      state?: string;
      jobCount: number;
      avgSalary?: number;
    };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4">
        <div className="space-y-2">
          <p className="font-bold text-base text-foreground">
            {data.city}
            {data.state && (
              <span className="text-muted-foreground text-sm">
                {" "}
                · {data.state}
              </span>
            )}
          </p>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {data.jobCount.toLocaleString()}
              </span>{" "}
              job opportunities
            </p>
            {data.avgSalary && (
              <p className="text-sm text-muted-foreground">
                Avg Salary:{" "}
                <span className="font-semibold text-green-500">
                  ${(data.avgSalary / 1000).toFixed(0)}k
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function TopCitiesChart({ data }: TopCitiesChartProps) {
  const router = useRouter();
  const topCities = data.slice(0, 10);

  // Generate gradient colors from blue to purple
  const generateColor = (index: number, total: number) => {
    // Interpolate between blue and purple
    const ratio = index / (total - 1);
    const r = Math.round(59 + (139 - 59) * ratio); // 59 (blue) to 139 (purple)
    const g = Math.round(130 - (130 - 92) * ratio); // 130 to 92
    const b = Math.round(246 - (246 - 246) * ratio); // 246 to 246
    return `rgb(${r}, ${g}, ${b})`;
  };

  const chartData = topCities.map((city, index) => ({
    ...city,
    displayName: city.state ? `${city.city}, ${city.state}` : city.city,
    fill: generateColor(index, topCities.length),
  }));

  const handleBarClick = (data: any) => {
    if (data && data.slug) {
      router.push(`/locations/${data.slug}`);
    }
  };

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle>Top Cities by Job Opportunities</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Discover the hottest job markets across the country
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 20, right: 30, top: 5, bottom: 5 }}
          >
            <defs>
              {chartData.map((entry, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`gradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor={entry.fill} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={entry.fill} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgb(148 163 184)"
              opacity={0.2}
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fill: "rgb(148 163 184)" }}
              stroke="rgb(148 163 184)"
              tickFormatter={(value) => value.toLocaleString()}
            />
            <YAxis
              dataKey="displayName"
              type="category"
              width={150}
              className="text-sm"
              tick={{ fill: "rgb(148 163 184)" }}
              stroke="rgb(148 163 184)"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "transparent" }}
            />
            <Bar
              dataKey="jobCount"
              radius={[0, 8, 8, 0]}
              animationDuration={800}
              className="cursor-pointer"
              onClick={handleBarClick}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#gradient-${index})`}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Click on any bar to explore detailed insights for that location
        </p>
      </CardContent>
    </Card>
  );
}
