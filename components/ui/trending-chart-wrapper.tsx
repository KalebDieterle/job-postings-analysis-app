"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";

type TrendingSkill = {
  skill_abr: string;
  skill_name: string;
  count: number;
};

export function TrendingChartWrapper({ data }: { data: TrendingSkill[] }) {
  return (
    <div className="w-full max-w-5xl rounded-xl border bg-background p-6 shadow-lg">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-gray-100">
        Trending Skills (Last 7 Days)
      </h2>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          {/* Grid lines */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          {/* Gradient fill for bars */}
          <defs>
            <linearGradient id="skillGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
            </linearGradient>
          </defs>

          {/* X-axis */}
          <XAxis
            dataKey="skill_name"
            tick={{ fontSize: 12, fill: "#374151", fontWeight: 500 }}
            interval={0}
            angle={-40}
            textAnchor="end"
            height={60}
          />

          {/* Y-axis */}
          <YAxis
            tick={{ fontSize: 12, fill: "#374151" }}
            allowDecimals={false}
          />

          {/* Tooltip */}
          <Tooltip
            cursor={{ fill: "rgba(99, 102, 241, 0.1)" }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as TrendingSkill;
                return (
                  <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded shadow">
                    <p className="font-semibold">{data.skill_name}</p>
                    <p>Total Postings: {data.count}</p>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Legend */}
          <Legend
            verticalAlign="top"
            height={36}
            content={() => (
              <div className="flex items-center justify-start space-x-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#6366f1" }}
                />
                <span className="text-gray-700 dark:text-gray-200 font-medium">
                  Total Postings
                </span>
              </div>
            )}
          />

          {/* Bars */}
          <Bar
            dataKey="count"
            fill="url(#skillGradient)"
            radius={[6, 6, 0, 0]}
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
