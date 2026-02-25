"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

// Data structure for the chart points
interface CompanyData {
  company: string;
  median_salary: number;
  avg_salary: number;
  posting_count?: number;
  employee_count?: number;
  fortune_rank?: number;
}

// Component Props
interface CompanyAvgSalaryGraphProps {
  data: CompanyData[];
  globalMedian: number;
  fortuneData: CompanyData[];
}

export const CompanyAvgSalaryGraph: React.FC<CompanyAvgSalaryGraphProps> = ({
  data,
  globalMedian,
  fortuneData,
}) => {
  // Mode restricted to 'salary' (Market) or 'fortune' (Top 10 NW)
  const [viewMode, setViewMode] = useState<"salary" | "fortune">("fortune");

  // Process data: Filter out $0 values, EOX Vantage, and sort based on active mode
  const chartData = useMemo(() => {
    const source = viewMode === "fortune" ? fortuneData : data;

    return [...source]
      .filter((item) => (item.median_salary ?? item.avg_salary) > 0)
      .filter((item) => !item.company.toLowerCase().includes("eox vantage")) // Filter out EOX Vantage
      .sort(
        (a, b) =>
          viewMode === "fortune"
            ? (a.fortune_rank ?? 0) - (b.fortune_rank ?? 0) // Rank-based sorting
            : (b.median_salary ?? b.avg_salary) - (a.median_salary ?? a.avg_salary),
      );
  }, [data, viewMode, fortuneData]);

  // Dynamic bar coloring based on market average
  const getBarColor = (salary: number) => {
    const diff = globalMedian > 0 ? ((salary - globalMedian) / globalMedian) * 100 : 0;
    return diff > 0 ? "#10b981" : "#fbbf24";
  };

  // Custom Tooltip for the dark theme
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;

    return (
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 shadow-2xl">
        <p className="font-bold text-white text-sm mb-1">{item.company}</p>
        <div className="space-y-1">
          <p className="text-emerald-400 text-lg font-bold">
            ${Math.round(item.median_salary ?? item.avg_salary).toLocaleString()}
          </p>
          {item.fortune_rank && (
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">
              Fortune Rank: #{item.fortune_rank}
            </p>
          )}
          <div className="pt-1 border-t border-slate-800 mt-1">
            <p className="text-slate-500 text-[10px] font-medium">
              {item.employee_count?.toLocaleString() || "N/A"} Total Employees
            </p>
            <p className="text-slate-500 text-[10px] font-medium">
              {item.posting_count ?? 0} Active Postings Analyzed
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* View Switcher */}
      <div className="flex justify-end mb-6">
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-inner">
          <button
            onClick={() => setViewMode("fortune")}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all duration-200 ${
              viewMode === "fortune"
                ? "bg-emerald-600 text-white shadow-lg"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Top 10 Companies (NW)
          </button>
          <button
            onClick={() => setViewMode("salary")}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all duration-200 ${
              viewMode === "salary"
                ? "bg-emerald-600 text-white shadow-lg"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Highest Median Salary
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-125">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e293b"
              vertical={false}
            />
            <XAxis
              dataKey="company"
              tick={{ fontSize: 10, fill: "#64748b" }}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={80}
            />
            <YAxis
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />

            <Bar dataKey="median_salary" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.median_salary ?? entry.avg_salary)}
                />
              ))}
            </Bar>

            <ReferenceLine
              y={globalMedian}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: "Market Median",
                position: "insideBottomRight",
                fill: "#ef4444",
                fontSize: 10,
                offset: 10,
              }}
              ifOverflow="extendDomain"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
