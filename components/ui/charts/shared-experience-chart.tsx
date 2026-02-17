"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface ExperienceData {
  level: string | null;
  count: number;
}

interface SharedExperienceChartProps {
  data: ExperienceData[];
  height?: number;
  showInnerRadius?: boolean;
}

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe"];

const LEVEL_LABELS: Record<string, string> = {
  "Entry level": "Entry Level",
  "Mid-Senior level": "Mid Level",
  Associate: "Associate",
  Director: "Director",
  Executive: "Executive",
  Internship: "Internship",
  "Not Applicable": "Not Specified",
};

export function SharedExperienceChart({
  data,
  height = 350,
  showInnerRadius = true,
}: SharedExperienceChartProps) {
  const filteredData = data.filter((item) => item.level !== null);
  const total = filteredData.reduce((sum, item) => sum + item.count, 0);

  const formattedData = filteredData.map((item) => ({
    name: LEVEL_LABELS[item.level!] || item.level!,
    value: item.count,
    percentage: ((item.count / total) * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={formattedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry: any) => `${entry.name}: ${entry.percentage}%`}
          outerRadius={110}
          innerRadius={showInnerRadius ? 45 : 0}
          fill="#8884d8"
          dataKey="value"
        >
          {formattedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const entry = payload[0];
              const value = entry?.value as number | undefined;
              const percentage = (entry?.payload as { percentage?: string })
                ?.percentage;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        {entry.name}
                      </span>
                      <span className="font-bold">
                        {value?.toLocaleString() ?? 0} jobs ({percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={40}
          formatter={(value, entry: any) => (
            <span className="text-sm">
              {value} ({entry.payload.value.toLocaleString()})
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
