"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

interface CompanyData {
  company: string;
  avg_salary: number;
  posting_count?: number;
  employee_count?: number;
}

interface CompanyAvgSalaryGraphProps {
  data: CompanyData[];
  sizeData?: CompanyData[];
  globalAvg: number;
}

export const CompanyAvgSalaryGraph: React.FC<CompanyAvgSalaryGraphProps> = ({
  data,
  sizeData,
  globalAvg,
}) => {
  const [viewMode, setViewMode] = useState<'salary' | 'size'>('salary');

  const chartData = useMemo(() => {
    if (viewMode === 'salary') {
      return [...data]
        .filter((item) => item.company && item.avg_salary > 0 && item.avg_salary < 600000)
        .sort((a, b) => b.avg_salary - a.avg_salary)
        .slice(0, 10);
    } else {
      // Use sizeData if provided, otherwise fallback to data
      const source = (sizeData && sizeData.length > 0) ? sizeData : data;
      return [...source]
        .filter((item) => item.company)
        .sort((a, b) => (b.employee_count ?? 0) - (a.employee_count ?? 0))
        .slice(0, 10);
    }
  }, [data, sizeData, viewMode]);

  const getBarColor = (salary: number) => {
    if (salary === 0) return "#475569"; // Slate-600 for companies with no salary data
    const diffPercent = ((salary - globalAvg) / globalAvg) * 100;
    if (diffPercent > 20) return "#10b981"; 
    if (diffPercent > 0) return "#34d399";  
    return "#fbbf24";                       
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl">
          <p className="font-bold text-white text-sm mb-1">{item.company}</p>
          <div className="flex flex-col gap-1">
            <p className="text-emerald-400 text-lg font-extrabold">
              {item.avg_salary > 0 ? `$${Math.round(item.avg_salary).toLocaleString()}` : 'Salary N/A'}
            </p>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {(item.employee_count ?? 0).toLocaleString()} Employees
            </p>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {(item.posting_count ?? 0).toLocaleString()} Active Postings
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-end mb-4">
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('salary')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
              viewMode === 'salary' ? 'bg-emerald-500 text-white' : 'text-slate-500'
            }`}
          >
            By Salary
          </button>
          <button
            onClick={() => setViewMode('size')}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
              viewMode === 'size' ? 'bg-emerald-500 text-white' : 'text-slate-500'
            }`}
          >
            By Size
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="company"
              tick={{ fontSize: 10, fill: '#64748b' }}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={80}
            />
            <YAxis
              tickFormatter={(val) => viewMode === 'salary' ? `$${val / 1000}k` : (val >= 1000 ? `${val/1000}k` : val)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            
            {viewMode === 'salary' && (
              <ReferenceLine
                y={globalAvg}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: `Market Avg`, position: "top", fill: '#ef4444', fontSize: 10 }}
              />
            )}

            <Bar 
              dataKey={viewMode === 'salary' ? "avg_salary" : "employee_count"} 
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.avg_salary)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};